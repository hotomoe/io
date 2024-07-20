<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
	<MkSwitch v-model="isLocked" @update:modelValue="save()">{{ i18n.ts.makeFollowManuallyApprove }}<template #caption>{{ i18n.ts.lockedAccountInfo }}</template></MkSwitch>
	<MkSwitch v-if="isLocked" v-model="autoAcceptFollowed" @update:modelValue="save()">{{ i18n.ts.autoAcceptFollowed }}</MkSwitch>

	<MkSwitch v-model="publicReactions" @update:modelValue="save()">
		{{ i18n.ts.makeReactionsPublic }}
		<template #caption>{{ i18n.ts.makeReactionsPublicDescription }}</template>
	</MkSwitch>

	<MkSelect v-model="followingVisibility" @update:modelValue="save()">
		<template #label>{{ i18n.ts.followingVisibility }}</template>
		<option value="public">{{ i18n.ts._ffVisibility.public }}</option>
		<option value="followers">{{ i18n.ts._ffVisibility.followers }}</option>
		<option value="private">{{ i18n.ts._ffVisibility.private }}</option>
	</MkSelect>

	<MkSelect v-model="followersVisibility" @update:modelValue="save()">
		<template #label>{{ i18n.ts.followersVisibility }}</template>
		<option value="public">{{ i18n.ts._ffVisibility.public }}</option>
		<option value="followers">{{ i18n.ts._ffVisibility.followers }}</option>
		<option value="private">{{ i18n.ts._ffVisibility.private }}</option>
	</MkSelect>

	<MkSwitch v-model="hideOnlineStatus" @update:modelValue="save()">
		{{ i18n.ts.hideOnlineStatus }}
		<template #caption>{{ i18n.ts.hideOnlineStatusDescription }}</template>
	</MkSwitch>
	<MkSwitch v-model="noCrawle" @update:modelValue="save()">
		{{ i18n.ts.noCrawle }}
		<template #caption>{{ i18n.ts.noCrawleDescription }}</template>
	</MkSwitch>
	<MkSwitch v-model="preventAiLearning" @update:modelValue="save()">
		{{ i18n.ts.preventAiLearning }}<span class="_beta">{{ i18n.ts.beta }}</span>
		<template #caption>{{ i18n.ts.preventAiLearningDescription }}</template>
	</MkSwitch>
	<MkSwitch v-model="isExplorable" @update:modelValue="save()">
		{{ i18n.ts.makeExplorable }}
		<template #caption>{{ i18n.ts.makeExplorableDescription }}</template>
	</MkSwitch>

	<FormSection>
		<div class="_gaps_m">
			<MkSwitch v-model="rememberNoteVisibility">{{ i18n.ts.rememberNoteVisibility }}</MkSwitch>
			<MkFolder v-if="!rememberNoteVisibility">
				<template #label>{{ i18n.ts.defaultNoteVisibility }}</template>
				<template v-if="defaultNoteVisibility === 'public'" #suffix>{{ i18n.ts._visibility.public }}</template>
				<template v-else-if="defaultNoteVisibility === 'home'" #suffix>{{ i18n.ts._visibility.home }}</template>
				<template v-else-if="defaultNoteVisibility === 'followers'" #suffix>{{ i18n.ts._visibility.followers }}</template>
				<template v-else-if="defaultNoteVisibility === 'specified'" #suffix>{{ i18n.ts._visibility.specified }}</template>

				<div class="_gaps_m">
					<MkSelect v-model="defaultNoteVisibility">
						<option value="public">{{ i18n.ts._visibility.public }}</option>
						<option value="home">{{ i18n.ts._visibility.home }}</option>
						<option value="followers">{{ i18n.ts._visibility.followers }}</option>
						<option value="specified">{{ i18n.ts._visibility.specified }}</option>
					</MkSelect>
					<MkSwitch v-model="defaultNoteLocalOnly">{{ i18n.ts._visibility.disableFederation }}</MkSwitch>
				</div>
			</MkFolder>
		</div>
		<MkSwitch v-model="keepCw">{{ i18n.ts.keepCw }}</MkSwitch>
	</FormSection>

	<FormSection>
		<template #label>{{ i18n.ts.hideSensitiveInformation }}</template>

		<div class="_gaps_m">
			<MkSwitch v-model="hideSensitiveInformation">
				{{ i18n.ts._hideSensitiveInformation.use }}
				<template #caption>{{ i18n.ts._hideSensitiveInformation.about }}</template>
			</MkSwitch>
			<MkFolder v-if="hideSensitiveInformation">
				<template #label>{{ i18n.ts._hideSensitiveInformation.directMessages }}</template>
				<template v-if="hideDirectMessages" #suffix>{{ i18n.ts._hideSensitiveInformation.itsHidden }}</template>
				<template v-else #suffix>{{ i18n.ts._hideSensitiveInformation.itsNotHidden }}</template>
				<MkSwitch v-model="hideDirectMessages">
					{{ i18n.ts._hideSensitiveInformation.directMessagesUse }}
					<template #caption>{{ i18n.ts._hideSensitiveInformation.directMessagesDescription }}</template>
				</MkSwitch>
			</MkFolder>
			<MkFolder v-if="hideSensitiveInformation">
				<template #label>{{ i18n.ts._hideSensitiveInformation.drive }}</template>
				<template v-if="hideDirectMessages" #suffix>{{ i18n.ts._hideSensitiveInformation.itsHidden }}</template>
				<template v-else #suffix>{{ i18n.ts._hideSensitiveInformation.itsNotHidden }}</template>
				<MkSwitch v-model="hideDirectMessages">
					{{ i18n.ts._hideSensitiveInformation.driveUse }}
					<template #caption>{{ i18n.ts._hideSensitiveInformation.driveDescription }}</template>
				</MkSwitch>
			</MkFolder>
			<MkFolder v-if="hideSensitiveInformation && $i.isModerator">
				<template #label>{{ i18n.ts._hideSensitiveInformation.moderationLog }}</template>
				<template v-if="hideDirectMessages" #suffix>{{ i18n.ts._hideSensitiveInformation.itsHidden }}</template>
				<template v-else #suffix>{{ i18n.ts._hideSensitiveInformation.itsNotHidden }}</template>
				<MkSwitch v-model="hideDirectMessages">
					{{ i18n.ts._hideSensitiveInformation.moderationLogUse }}
					<template #caption>{{ i18n.ts._hideSensitiveInformation.moderationLogDescription }}</template>
				</MkSwitch>
			</MkFolder>
			<MkFolder v-if="hideSensitiveInformation && $i.isModerator">
				<template #label>{{ i18n.ts._hideSensitiveInformation.roles }}</template>
				<template v-if="hideDirectMessages" #suffix>{{ i18n.ts._hideSensitiveInformation.itsHidden }}</template>
				<template v-else #suffix>{{ i18n.ts._hideSensitiveInformation.itsNotHidden }}</template>
				<MkSwitch v-model="hideDirectMessages">
					{{ i18n.ts._hideSensitiveInformation.rolesUse }}
					<template #caption>{{ i18n.ts._hideSensitiveInformation.rolesDescription }}</template>
				</MkSwitch>
			</MkFolder>
		</div>
	</FormSection>
</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkSelect from '@/components/MkSelect.vue';
import FormSection from '@/components/form/section.vue';
import MkFolder from '@/components/MkFolder.vue';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import { signinRequired } from '@/account.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';

const $i = signinRequired();

const isLocked = ref($i.isLocked);
const autoAcceptFollowed = ref($i.autoAcceptFollowed);
const noCrawle = ref($i.noCrawle);
const preventAiLearning = ref($i.preventAiLearning);
const isExplorable = ref($i.isExplorable);
const hideOnlineStatus = ref($i.hideOnlineStatus);
const publicReactions = ref($i.publicReactions);
const followingVisibility = ref($i.followingVisibility);
const followersVisibility = ref($i.followersVisibility);

const defaultNoteVisibility = computed(defaultStore.makeGetterSetter('defaultNoteVisibility'));
const defaultNoteLocalOnly = computed(defaultStore.makeGetterSetter('defaultNoteLocalOnly'));
const rememberNoteVisibility = computed(defaultStore.makeGetterSetter('rememberNoteVisibility'));
const keepCw = computed(defaultStore.makeGetterSetter('keepCw'));
const hideSensitiveInformation = computed(defaultStore.makeGetterSetter('hideSensitiveInformation'));
const hideDirectMessages = computed(defaultStore.makeGetterSetter('hideDirectMessages'));

function save() {
	misskeyApi('i/update', {
		isLocked: !!isLocked.value,
		autoAcceptFollowed: !!autoAcceptFollowed.value,
		noCrawle: !!noCrawle.value,
		preventAiLearning: !!preventAiLearning.value,
		isExplorable: !!isExplorable.value,
		hideOnlineStatus: !!hideOnlineStatus.value,
		publicReactions: !!publicReactions.value,
		followingVisibility: followingVisibility.value,
		followersVisibility: followersVisibility.value,
	});
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePageMetadata(() => ({
	title: i18n.ts.privacy,
	icon: 'ti ti-lock-open',
}));
</script>
