/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Module } from '@nestjs/common';
import { CoreModule } from '@/core/CoreModule.js';
import { GlobalModule } from '@/GlobalModule.js';
import { QueueLoggerService } from './QueueLoggerService.js';
import { QueueProcessorService } from './QueueProcessorService.js';
import { DeliverProcessorService } from './processors/DeliverProcessorService.js';
import { EndedPollNotificationProcessorService } from './processors/EndedPollNotificationProcessorService.js';
import { InboxProcessorService } from './processors/InboxProcessorService.js';
import { WebhookDeliverProcessorService } from './processors/WebhookDeliverProcessorService.js';
import { CheckExpiredMutingsProcessorService } from './processors/CheckExpiredMutingsProcessorService.js';
import { CheckMissingScheduledNoteProcessorService } from './processors/CheckMissingScheduledNoteProcessorService.js';
import { CleanChartsProcessorService } from './processors/CleanChartsProcessorService.js';
import { CleanProcessorService } from './processors/CleanProcessorService.js';
import { CleanRemoteFilesProcessorService } from './processors/CleanRemoteFilesProcessorService.js';
import { UserSuspendProcessorService } from './processors/UserSuspendProcessorService.js';
import { DeleteAccountProcessorService } from './processors/DeleteAccountProcessorService.js';
import { DeleteDriveFilesProcessorService } from './processors/DeleteDriveFilesProcessorService.js';
import { DeleteFileProcessorService } from './processors/DeleteFileProcessorService.js';
import { ReindexNotesProcessorService } from './processors/ReindexNotesProcessorService.js';
import { ExportBlockingProcessorService } from './processors/ExportBlockingProcessorService.js';
import { ExportCustomEmojisProcessorService } from './processors/ExportCustomEmojisProcessorService.js';
import { ExportFollowingProcessorService } from './processors/ExportFollowingProcessorService.js';
import { ExportMutingProcessorService } from './processors/ExportMutingProcessorService.js';
import { ExportNotesProcessorService } from './processors/ExportNotesProcessorService.js';
import { ExportClipsProcessorService } from './processors/ExportClipsProcessorService.js';
import { ExportUserListsProcessorService } from './processors/ExportUserListsProcessorService.js';
import { ExportAntennasProcessorService } from './processors/ExportAntennasProcessorService.js';
import { ImportBlockingProcessorService } from './processors/ImportBlockingProcessorService.js';
import { ImportCustomEmojisProcessorService } from './processors/ImportCustomEmojisProcessorService.js';
import { ImportFollowingProcessorService } from './processors/ImportFollowingProcessorService.js';
import { ImportMutingProcessorService } from './processors/ImportMutingProcessorService.js';
import { ImportUserListsProcessorService } from './processors/ImportUserListsProcessorService.js';
import { ImportAntennasProcessorService } from './processors/ImportAntennasProcessorService.js';
import { ResyncChartsProcessorService } from './processors/ResyncChartsProcessorService.js';
import { ReportAbuseProcessorService } from './processors/ReportAbuseProcessorService.js';
import { ScheduledNoteProcessorService } from './processors/ScheduledNoteProcessorService.js';
import { TickChartsProcessorService } from './processors/TickChartsProcessorService.js';
import { AggregateRetentionProcessorService } from './processors/AggregateRetentionProcessorService.js';
import { ExportFavoritesProcessorService } from './processors/ExportFavoritesProcessorService.js';
import { RelationshipProcessorService } from './processors/RelationshipProcessorService.js';

@Module({
	imports: [
		GlobalModule,
		CoreModule,
	],
	providers: [
		QueueLoggerService,
		TickChartsProcessorService,
		ResyncChartsProcessorService,
		CleanChartsProcessorService,
		CheckExpiredMutingsProcessorService,
		CheckMissingScheduledNoteProcessorService,
		CleanProcessorService,
		DeleteDriveFilesProcessorService,
		ReindexNotesProcessorService,
		ExportCustomEmojisProcessorService,
		ExportNotesProcessorService,
		ExportClipsProcessorService,
		ExportFavoritesProcessorService,
		ExportFollowingProcessorService,
		ExportMutingProcessorService,
		ExportBlockingProcessorService,
		ExportUserListsProcessorService,
		ExportAntennasProcessorService,
		ImportFollowingProcessorService,
		ImportMutingProcessorService,
		ImportBlockingProcessorService,
		ImportUserListsProcessorService,
		ImportCustomEmojisProcessorService,
		ImportAntennasProcessorService,
		UserSuspendProcessorService,
		DeleteAccountProcessorService,
		DeleteFileProcessorService,
		CleanRemoteFilesProcessorService,
		RelationshipProcessorService,
		ReportAbuseProcessorService,
		ScheduledNoteProcessorService,
		WebhookDeliverProcessorService,
		EndedPollNotificationProcessorService,
		DeliverProcessorService,
		InboxProcessorService,
		AggregateRetentionProcessorService,
		QueueProcessorService,
	],
	exports: [
		QueueProcessorService,
	],
})
export class QueueProcessorModule {}
