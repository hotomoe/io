/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import type { MiAntenna } from '@/models/Antenna.js';
import type { MiNote } from '@/models/Note.js';
import type { MiUser } from '@/models/User.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import * as Acct from '@/misc/acct.js';
import type { Packed } from '@/misc/json-schema.js';
import { isUserRelated } from '@/misc/is-user-related.js';
import { DI } from '@/di-symbols.js';
import type { AntennasRepository, FollowingsRepository, UserListMembershipsRepository } from '@/models/_.js';
import { UtilityService } from '@/core/UtilityService.js';
import { CacheService } from '@/core/CacheService.js';
import { bindThis } from '@/decorators.js';
import type { GlobalEvents } from '@/core/GlobalEventService.js';
import { FanoutTimelineService } from '@/core/FanoutTimelineService.js';
import { RolePolicies, RoleService } from '@/core/RoleService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import type { OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class AntennaService implements OnApplicationShutdown {
	private antennasFetched: boolean;
	private antennas: MiAntenna[];

	constructor(
		@Inject(DI.redisForTimelines)
		private redisForTimelines: Redis.Redis,

		@Inject(DI.redisForSub)
		private redisForSub: Redis.Redis,

		@Inject(DI.antennasRepository)
		private antennasRepository: AntennasRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		@Inject(DI.userListMembershipsRepository)
		private userListMembershipsRepository: UserListMembershipsRepository,

		private cacheService: CacheService,
		private userEntityService: UserEntityService,
		private utilityService: UtilityService,
		private globalEventService: GlobalEventService,
		private fanoutTimelineService: FanoutTimelineService,
		private roleService: RoleService,
	) {
		this.antennasFetched = false;
		this.antennas = [];

		this.redisForSub.on('message', this.onRedisMessage);
	}

	@bindThis
	private async onRedisMessage(_: string, data: string): Promise<void> {
		const obj = JSON.parse(data);

		if (obj.channel === 'internal') {
			const { type, body } = obj.message as GlobalEvents['internal']['payload'];
			switch (type) {
				case 'antennaCreated':
					this.antennas.push({ // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
						...body,
						createdAt: new Date(body.createdAt),
						lastUsedAt: new Date(body.lastUsedAt),
						user: null, // joinなカラムは通常取ってこないので
						userList: null, // joinなカラムは通常取ってこないので
					});
					break;
				case 'antennaUpdated': {
					const idx = this.antennas.findIndex(a => a.id === body.id);
					if (idx >= 0) {
						this.antennas[idx] = { // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
							...body,
							createdAt: new Date(body.createdAt),
							lastUsedAt: new Date(body.lastUsedAt),
							user: null, // joinなカラムは通常取ってこないので
							userList: null, // joinなカラムは通常取ってこないので
						};
					} else {
						// サーバ起動時にactiveじゃなかった場合、リストに持っていないので追加する必要あり
						this.antennas.push({ // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
							...body,
							createdAt: new Date(body.createdAt),
							lastUsedAt: new Date(body.lastUsedAt),
							user: null, // joinなカラムは通常取ってこないので
							userList: null, // joinなカラムは通常取ってこないので
						});
					}
				}
					break;
				case 'antennaDeleted':
					this.antennas = this.antennas.filter(a => a.id !== body.id);
					break;
				default:
					break;
			}
		}
	}

	@bindThis
	public async addNoteToAntennas(note: MiNote, noteUser: { id: MiUser['id']; username: string; host: string | null; isBot: boolean; }): Promise<void> {
		const antennas = await this.getAntennas();
		const antennasWithMatchResult = await Promise.all(antennas.map(antenna => this.checkHitAntenna(antenna, note, noteUser).then(hit => [antenna, hit] as const)));
		const matchedAntennas = antennasWithMatchResult.filter(([, hit]) => hit).map(([antenna]) => antenna);

		const redisPipeline = this.redisForTimelines.pipeline();

		const policies = new Map((await Promise.allSettled(Array.from(new Set(matchedAntennas.map(antenna => antenna.userId))).map(async userId => [userId, await this.roleService.getUserPolicies(userId)] as const)))
			.filter((result): result is PromiseFulfilledResult<[string, RolePolicies]> => result.status === 'fulfilled')
			.map(result => result.value));

		for (const antenna of matchedAntennas) {
			const { antennaNotesLimit } = policies.get(antenna.userId) ?? await this.roleService.getUserPolicies(antenna.userId);

			this.fanoutTimelineService.push(`antennaTimeline:${antenna.id}`, note.id, antennaNotesLimit, redisPipeline);
			this.globalEventService.publishAntennaStream(antenna.id, 'note', note);
		}

		redisPipeline.exec();
	}

	// NOTE: フォローしているユーザーのノート、リストのユーザーのノート、グループのユーザーのノート指定はパフォーマンス上の理由で無効になっている

	@bindThis
	private async filter(userId: MiUser['id'], note: (MiNote | Packed<'Note'>)): Promise<boolean> {
		const [
			userIdsWhoMeMuting,
			userIdsWhoBlockingMe,
		] = await Promise.all([
			this.cacheService.userMutingsCache.fetch(userId),
			this.cacheService.userBlockedCache.fetch(userId),
		]);
		if (isUserRelated(note, userIdsWhoBlockingMe)) return false;
		if (isUserRelated(note, userIdsWhoMeMuting)) return false;
		if (['followers', 'specified'].includes(note.visibility)) {
			if (userId === note.userId) return true;
			if (note.visibility === 'followers') {
				return await this.cacheService.userFollowingsCache.fetch(userId).then(followings => Object.hasOwn(followings, note.userId));
			}
			if (!note.visibleUserIds?.includes(userId)) return false;
		}
		return true;
	}

	@bindThis
	public async checkHitAntenna(antenna: MiAntenna, note: (MiNote | Packed<'Note'>), noteUser: { id: MiUser['id']; username: string; host: string | null; isBot: boolean; }): Promise<boolean> {
		const result = await this.filter(antenna.userId, note);
		if (!result) return false;

		if (antenna.excludeBots && noteUser.isBot) return false;

		if (antenna.localOnly && noteUser.host != null) return false;

		if (!antenna.withReplies && note.replyId != null) return false;

		if (antenna.src === 'home') {
			// TODO
		} else if (antenna.src === 'list') {
			if (antenna.userListId == null) return false;
			const exists = await this.userListMembershipsRepository.exists({
				where: {
					userListId: antenna.userListId,
					userId: note.userId,
				},
			});
			if (!exists) return false;
		} else if (antenna.src === 'users') {
			const accts = antenna.users.map(x => {
				const { username, host } = Acct.parse(x);
				return this.utilityService.getFullApAccount(username, host).toLowerCase();
			});
			if (!accts.includes(this.utilityService.getFullApAccount(noteUser.username, noteUser.host).toLowerCase())) return false;
		} else if (antenna.src === 'users_blacklist') {
			const accts = antenna.users.map(x => {
				const { username, host } = Acct.parse(x);
				return this.utilityService.getFullApAccount(username, host).toLowerCase();
			});
			if (accts.includes(this.utilityService.getFullApAccount(noteUser.username, noteUser.host).toLowerCase())) return false;
		}

		const keywords = antenna.keywords
			// Clean up
			.map(xs => xs.filter(x => x !== ''))
			.filter(xs => xs.length > 0);

		if (keywords.length > 0) {
			if (note.text == null && note.cw == null) return false;

			const _text = (note.text ?? '') + '\n' + (note.cw ?? '');

			const matched = keywords.some(and =>
				and.every(keyword =>
					antenna.caseSensitive
						? _text.includes(keyword)
						: _text.toLowerCase().includes(keyword.toLowerCase()),
				));

			if (!matched) return false;
		}

		const excludeKeywords = antenna.excludeKeywords
			// Clean up
			.map(xs => xs.filter(x => x !== ''))
			.filter(xs => xs.length > 0);

		if (excludeKeywords.length > 0) {
			if (note.text == null && note.cw == null) return false;

			const _text = (note.text ?? '') + '\n' + (note.cw ?? '');

			const matched = excludeKeywords.some(and =>
				and.every(keyword =>
					antenna.caseSensitive
						? _text.includes(keyword)
						: _text.toLowerCase().includes(keyword.toLowerCase()),
				));

			if (matched) return false;
		}

		if (antenna.withFile) {
			if (note.fileIds && note.fileIds.length === 0) return false;
		}

		// TODO: eval expression

		return true;
	}

	@bindThis
	public async getAntennas() {
		if (!this.antennasFetched) {
			this.antennas = await this.antennasRepository.findBy({
				isActive: true,
			});
			this.antennasFetched = true;
		}

		return this.antennas;
	}

	@bindThis
	public dispose(): void {
		this.redisForSub.off('message', this.onRedisMessage);
	}

	@bindThis
	public onApplicationShutdown(signal?: string | undefined): void {
		this.dispose();
	}
}
