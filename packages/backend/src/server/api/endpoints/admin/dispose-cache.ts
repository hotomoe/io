/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { CacheService } from '@/core/CacheService.js';
import { ApDbResolverService } from '@/core/activitypub/ApDbResolverService.js';
import {AuthenticateService} from "@/server/api/AuthenticateService.js";

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	secure: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private cacheService: CacheService,
		private apDbResolverService: ApDbResolverService,
	) {
		super(meta, paramDef, async (ps, me) => {
			this.cacheService.dispose();
			this.apDbResolverService.dispose();
		});
	}
}
