/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import bcrypt from 'bcryptjs';
import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository, UserProfilesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DeleteAccountService } from '@/core/DeleteAccountService.js';
import { RoleService } from '@/core/RoleService.js';
import { DI } from '@/di-symbols.js';
import { UserAuthService } from '@/core/UserAuthService.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	requireCredential: true,

	secure: true,

	errors: {
		removalDisabled: {
			message: 'Account removal is disabled by your role.',
			code: 'REMOVAL_DISABLED',
			id: '453d954b-3d8b-4df0-a261-b26ec6660ea3',
		},
		authenticationFailed: {
			message: 'Your password or 2FA token is invalid.',
			code: 'AUTHENTICATION_FAILED',
			id: 'ea791cff-63e7-4b2a-92fc-646ab641794e',
		},
		alreadyRemoved: {
			message: 'Your account is already removed.',
			code: 'ACCOUNT_REMOVED',
			id: '59b8f0e6-6eb2-4dc1-a080-1de3108416d0',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		password: { type: 'string' },
		token: { type: 'string', nullable: true },
	},
	required: ['password'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		private userAuthService: UserAuthService,
		private deleteAccountService: DeleteAccountService,
		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: me.id });

			const policies = await this.roleService.getUserPolicies(me.id);
			if (!policies.canUseAccountRemoval) {
				throw new ApiError(meta.errors.removalDisabled);
			}

			const userDetailed = await this.usersRepository.findOneByOrFail({ id: me.id });
			if (userDetailed.isDeleted) {
				throw new ApiError(meta.errors.alreadyRemoved);
			}

			const passwordMatched = await bcrypt.compare(ps.password, profile.password!);
			if (!passwordMatched) {
				throw new ApiError(meta.errors.authenticationFailed);
			}

			if (profile.twoFactorEnabled) {
				const token = ps.token;
				if (token == null) {
					throw new ApiError(meta.errors.authenticationFailed);
				}

				await this.userAuthService.twoFactorAuthenticate(profile, token);
			}

			await this.deleteAccountService.deleteAccount(me, false, me);
		});
	}
}
