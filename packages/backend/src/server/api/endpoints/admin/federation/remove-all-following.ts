/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { FollowingsRepository, InstancesRepository, UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { QueueService } from '@/core/QueueService.js';
import { ApiError } from '@/server/api/error.js';
import { UtilityService } from '@/core/UtilityService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	secure: true,
	kind: 'write:admin:federation',

	errors: {
		instanceNotFound: {
			message: 'Instance with that hostname is not found.',
			code: 'INSTANCE_NOT_FOUND',
			id: '82791415-ae4b-4e82-bffe-e3dbc4322a0a',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		host: { type: 'string' },
	},
	required: ['host'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		@Inject(DI.instancesRepository)
		private instancesRepository: InstancesRepository,

		private queueService: QueueService,
		private utilityService: UtilityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const instance = await this.instancesRepository.findOneBy({ host: this.utilityService.toPuny(ps.host) });

			if (instance == null) {
				throw new ApiError(meta.errors.instanceNotFound);
			}

			const followings = await this.followingsRepository.findBy({
				followerHost: ps.host,
			});
			const followers = await this.followingsRepository.findBy({
				followeeHost: ps.host,
			});

			const followingPairs = await Promise.all(followings.map(f => Promise.all([
				this.usersRepository.findOneByOrFail({ id: f.followerId }),
				this.usersRepository.findOneByOrFail({ id: f.followeeId }),
			]).then(([from, to]) => [{ id: from.id }, { id: to.id }])));
			const followerPairs = await Promise.all(followers.map(f => Promise.all([
				this.usersRepository.findOneByOrFail({ id: f.followerId }),
				this.usersRepository.findOneByOrFail({ id: f.followeeId }),
			]).then(([from, to]) => [{ id: from.id }, { id: to.id }])));

			await this.queueService.createUnfollowJob(followingPairs.map(p => ({ from: p[0], to: p[1], silent: true })));
			await this.queueService.createUnfollowJob(followerPairs.map(p => ({ from: p[0], to: p[1], silent: true })));
		});
	}
}
