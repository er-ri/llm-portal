<script setup lang="ts">
import { computed, ref } from "vue";
import { useUserStore } from "@/store";
import type { UserInfo } from "@/store/modules/user/helper";
import { NButton, NInput, useMessage } from "naive-ui";
import { t } from "@/locales";

const ms = useMessage();

const userStore = useUserStore();
const userInfo = computed(() => userStore.userInfo);

const openaiApiKey = ref(userInfo.value.openaiApiKey ?? "");

function updateUserInfo(options: Partial<UserInfo>) {
  userStore.updateUserInfo(options);
  ms.success(t("common.success"));
}
</script>

<template>
  <div class="p-4 space-y-5 min-h-[200px]">
    <div class="space-y-6">
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[100px]">OpenAI API Key</span>
        <div class="flex-1">
          <NInput v-model:value="openaiApiKey" placeholder="" />
        </div>
        <NButton
          size="tiny"
          text
          type="primary"
          @click="updateUserInfo({ openaiApiKey })"
        >
          {{ $t("common.save") }}
        </NButton>
      </div>
    </div>
  </div>
</template>
