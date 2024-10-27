/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { DI } from '@/di-symbols.js';
import type Logger from '@/logger.js';
import type { DriveFilesRepository, NotesRepository, UserProfilesRepository, UsersRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import { DriveService } from '@/core/DriveService.js';
import { EmailService } from '@/core/EmailService.js';
import { SearchService } from '@/core/SearchService.js';
import { RoleService } from '@/core/RoleService.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type * as Bull from 'bullmq';
import type { DbUserDeleteJobData } from '../types.js';

@Injectable()
export class DeleteAccountProcessorService {
	private logger: Logger;

	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		private driveService: DriveService,
		private emailService: EmailService,
		private searchService: SearchService,
		private roleService: RoleService,
		private queueLoggerService: QueueLoggerService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('account:delete');
	}

	private async deleteNotes(user: MiUser) {
		while (true) {
			const notes = await this.notesRepository.find({
				where: {
					userId: user.id,
				},
				take: 100,
			});

			if (notes.length === 0) {
				break;
			}

			await this.notesRepository.delete(notes.map(note => note.id));

			for (const note of notes) {
				await this.searchService.unindexNote(note);
			}
		}

		this.logger.succ('All of notes deleted');
	}

	private async deleteFiles(user: MiUser) {
		while (true) {
			const files = await this.driveFilesRepository.find({
				where: {
					userId: user.id,
				},
				take: 10,
			});

			if (files.length === 0) {
				break;
			}

			for (const file of files) {
				await this.driveService.deleteFileSync(file);
			}
		}

		this.logger.succ('All of files deleted');
	}

	@bindThis
	public async process(job: Bull.Job<DbUserDeleteJobData>): Promise<string | void> {
		this.logger.info(`Deleting account of ${job.data.user.id} ...`, { userDeleteJobData: job.data });

		const user = await this.usersRepository.findOneBy({ id: job.data.user.id });
		if (user == null) {
			return;
		}

		const { canDeleteContent, canPurgeAccount } = !job.data.force
			? await this.roleService.getUserPolicies(user.id)
			: { canDeleteContent: true, canPurgeAccount: true };

		if (job.data.onlyFiles) {
			if (!canDeleteContent) return 'Permission denied';

			await this.deleteFiles(user);
			return 'Files deleted';
		}

		if (canDeleteContent) {
			await Promise.all([
				this.deleteNotes(user),
				this.deleteFiles(user),
			]);
		}

		if (user.token) { // Send email notification
			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });
			if (profile.email && profile.emailVerified) {
				await this.emailService.sendEmail(profile.email, 'Account deleted',
					'Your account has been deleted.',
					'Your account has been deleted.');
			}
		}

		// 制限されている もしくは soft指定されている場合は物理削除しない、代わりに凍結＋削除フラグを立てる
		if (!(canDeleteContent && canPurgeAccount) || job.data.soft) {
			await this.usersRepository.update(user.id, {
				token: null,
				isSuspended: true,
				isDeleted: true,
			});
		} else {
			await this.usersRepository.delete(job.data.user.id);
		}

		return 'Account deleted';
	}
}
