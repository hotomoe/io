/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { FollowingsRepository, InstancesRepository } from '@/models/_.js';
import { FetchInstanceMetadataService } from '@/core/FetchInstanceMetadataService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
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
		@Inject(DI.instancesRepository)
		private instancesRepository: InstancesRepository,
		private followingsRepository: FollowingsRepository,

		private utilityService: UtilityService,
		private federatedInstanceService: FederatedInstanceService,
		private fetchInstanceMetadataService: FetchInstanceMetadataService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const instance = await this.instancesRepository.findOneBy({ host: this.utilityService.toPuny(ps.host) });

			if (instance == null) {
				throw new ApiError(meta.errors.instanceNotFound);
			}

			const followingCount = await this.followingsRepository.countBy({ followerHost: this.utilityService.toPuny(ps.host) });
			const followersCount = await this.followingsRepository.countBy({ followeeHost: this.utilityService.toPuny(ps.host) });

			await this.federatedInstanceService.update(instance.id, {
				followingCount: followingCount,
				followersCount: followersCount,
			});
			await this.fetchInstanceMetadataService.fetchInstanceMetadata(instance, true);
		});
	}
}
