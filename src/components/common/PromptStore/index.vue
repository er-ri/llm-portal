<script setup lang="ts">
import type { DataTableColumns } from "naive-ui";
import { computed, h, ref, watch } from "vue";
import {
  NButton,
  NDataTable,
  NInput,
  NList,
  NListItem,
  NModal,
  NPopconfirm,
  NSpace,
  NThing,
  useMessage,
} from "naive-ui";
import { usePromptStore, useSettingStore } from "@/store";
import { useBasicLayout } from "@/hooks/useBasicLayout";
import { t } from "@/locales";

interface DataProps {
  renderKey: string;
  renderValue: string;
  key: string;
  value: string;
}

interface Props {
  visible: boolean;
}

interface Emit {
  (e: "update:visible", visible: boolean): void;
}

const settingStore = useSettingStore();

const props = defineProps<Props>();

const emit = defineEmits<Emit>();

const message = useMessage();

const show = computed({
  get: () => props.visible,
  set: (visible: boolean) => emit("update:visible", visible),
});

const showModal = ref(false);

const exportLoading = ref(false);

const searchValue = ref<string>("");

// 移动端自适应相关
const { isMobile } = useBasicLayout();

const promptStore = usePromptStore();

const promptList = ref<any>(promptStore.promptList);

// 用于添加修改的临时prompt参数
const tempPromptKey = ref("");
const tempPromptValue = ref("");

// Modal模式，根据不同模式渲染不同的Modal内容
const modalMode = ref("");

// 这个是为了后期的修改Prompt内容考虑，因为要针对无uuid的list进行修改，且考虑到不能出现标题和内容的冲突，所以就需要一个临时item来记录一下
const tempModifiedItem = ref<any>({});

// 添加修改导入都使用一个Modal, 临时修改内容占用tempPromptKey,切换状态前先将内容都清楚
const changeShowModal = (
  mode: "add" | "modify" | "local_import",
  selected = { key: "", value: "" }
) => {
  if (mode === "add") {
    tempPromptKey.value = "";
    tempPromptValue.value = "";
  } else if (mode === "modify") {
    tempModifiedItem.value = { ...selected };
    tempPromptKey.value = selected.key;
    tempPromptValue.value = selected.value;
  } else if (mode === "local_import") {
    tempPromptKey.value = "local_import";
    tempPromptValue.value = "";
  }

  showModal.value = !showModal.value;
  modalMode.value = mode;
};

// Set the prompt to the role settings
const setPrompt = (prompt: DataProps) => {
  let systemMessage = prompt.value;
  settingStore.updateSetting({ systemMessage });

  message.success("Set success");
};

// 控制 input 按钮
const inputStatus = computed(
  () =>
    tempPromptKey.value.trim().length < 1 ||
    tempPromptValue.value.trim().length < 1
);

// Prompt模板相关操作
const addPromptTemplate = () => {
  for (const i of promptList.value) {
    if (i.key === tempPromptKey.value) {
      message.error(t("store.addRepeatTitleTips"));
      return;
    }
    if (i.value === tempPromptValue.value) {
      message.error(
        t("store.addRepeatContentTips", { msg: tempPromptKey.value })
      );
      return;
    }
  }
  promptList.value.unshift({
    key: tempPromptKey.value,
    value: tempPromptValue.value,
  } as never);
  message.success(t("common.addSuccess"));
  changeShowModal("add");
};

const modifyPromptTemplate = () => {
  let index = 0;

  // 通过临时索引把待修改项摘出来
  for (const i of promptList.value) {
    if (
      i.key === tempModifiedItem.value.key &&
      i.value === tempModifiedItem.value.value
    )
      break;
    index = index + 1;
  }

  const tempList = promptList.value.filter((_: any, i: number) => i !== index);

  // 搜索有冲突的部分
  for (const i of tempList) {
    if (i.key === tempPromptKey.value) {
      message.error(t("store.editRepeatTitleTips"));
      return;
    }
    if (i.value === tempPromptValue.value) {
      message.error(t("store.editRepeatContentTips", { msg: i.key }));
      return;
    }
  }

  promptList.value = [
    { key: tempPromptKey.value, value: tempPromptValue.value },
    ...tempList,
  ] as never;
  message.success(t("common.editSuccess"));
  changeShowModal("modify");
};

const deletePromptTemplate = (row: { key: string; value: string }) => {
  promptList.value = [
    ...promptList.value.filter(
      (item: { key: string; value: string }) => item.key !== row.key
    ),
  ] as never;
  message.success(t("common.deleteSuccess"));
};

const clearPromptTemplate = () => {
  promptList.value = [];
  message.success(t("common.clearSuccess"));
};

const processImportPrompt = (promptData: string) => {
  const jsonData = JSON.parse(promptData);
  let key = "";
  let value = "";
  // 可以扩展加入更多模板字典的key
  if ("key" in jsonData[0]) {
    key = "key";
    value = "value";
  } else if ("act" in jsonData[0]) {
    key = "act";
    value = "prompt";
  } else {
    // 不支持的字典的key防止导入 以免破坏prompt商店打开
    message.warning("prompt key not supported.");
    throw new Error("prompt key not supported.");
  }

  for (const i of jsonData) {
    if (!(key in i) || !(value in i)) throw new Error(t("store.importError"));
    let safe = true;
    for (const j of promptList.value) {
      if (j.key === i[key]) {
        message.warning(t("store.importRepeatTitle", { msg: i[key] }));
        safe = false;
        break;
      }
      if (j.value === i[value]) {
        message.warning(t("store.importRepeatContent", { msg: i[key] }));
        safe = false;
        break;
      }
    }
    if (safe)
      promptList.value.unshift({ key: i[key], value: i[value] } as never);
  }
  message.success(t("common.importSuccess"));
};

const importPromptTemplate = (from = "online") => {
  try {
    const jsonData = JSON.parse(tempPromptValue.value);
    processImportPrompt(jsonData);
  } catch {
    message.error("JSON 格式错误，请检查 JSON 格式");
  }
  if (from === "local") showModal.value = !showModal.value;
};

// 模板导出
const exportPromptTemplate = () => {
  exportLoading.value = true;
  const jsonDataStr = JSON.stringify(promptList.value);
  const blob = new Blob([jsonDataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ChatGPTPromptTemplate.json";
  link.click();
  URL.revokeObjectURL(url);
  exportLoading.value = false;
};

// 移动端自适应相关
const renderTemplate = () => {
  const [keyLimit, valueLimit] = isMobile.value ? [10, 30] : [15, 50];

  return promptList.value.map((item: { key: string; value: string }) => {
    return {
      renderKey:
        item.key.length <= keyLimit
          ? item.key
          : `${item.key.substring(0, keyLimit)}...`,
      renderValue:
        item.value.length <= valueLimit
          ? item.value
          : `${item.value.substring(0, valueLimit)}...`,
      key: item.key,
      value: item.value,
    };
  });
};

const pagination = computed(() => {
  const [pageSize, pageSlot] = isMobile.value ? [6, 5] : [7, 15];
  return {
    pageSize,
    pageSlot,
  };
});

// table相关
const createColumns = (): DataTableColumns<DataProps> => {
  return [
    {
      title: t("store.title"),
      key: "renderKey",
    },
    {
      title: t("store.description"),
      key: "renderValue",
    },
    {
      title: t("common.action"),
      key: "actions",
      width: 100,
      align: "center",
      render(row) {
        return h(
          "div",
          { class: "flex items-center flex-col gap-2" },
          {
            default: () => [
              h(
                NButton,
                {
                  tertiary: true,
                  size: "small",
                  type: "info",
                  onClick: () => setPrompt(row),
                },
                { default: () => "Set" }
              ),
              h(
                NButton,
                {
                  tertiary: true,
                  size: "small",
                  type: "info",
                  onClick: () => changeShowModal("modify", row),
                },
                { default: () => t("common.edit") }
              ),
              h(
                NButton,
                {
                  tertiary: true,
                  size: "small",
                  type: "error",
                  onClick: () => deletePromptTemplate(row),
                },
                { default: () => t("common.delete") }
              ),
            ],
          }
        );
      },
    },
  ];
};

const columns = createColumns();

watch(
  () => promptList,
  () => {
    promptStore.updatePromptList(promptList.value);
  },
  { deep: true }
);

const dataSource = computed(() => {
  const data = renderTemplate();
  const value = searchValue.value;
  if (value && value !== "") {
    return data.filter((item: DataProps) => {
      return item.renderKey.includes(value) || item.renderValue.includes(value);
    });
  }
  return data;
});
</script>

<template>
  <NModal
    v-model:show="show"
    style="width: 90%; max-width: 900px"
    preset="card"
  >
    <div class="space-y-4">
      <div
        class="flex gap-3 mb-4"
        :class="[isMobile ? 'flex-col' : 'flex-row justify-between']"
      >
        <div class="flex items-center space-x-4">
          <NButton type="primary" size="small" @click="changeShowModal('add')">
            {{ $t("common.add") }}
          </NButton>
          <NButton size="small" @click="changeShowModal('local_import')">
            {{ $t("common.import") }}
          </NButton>
          <NButton
            size="small"
            :loading="exportLoading"
            @click="exportPromptTemplate()"
          >
            {{ $t("common.export") }}
          </NButton>
          <NPopconfirm @positive-click="clearPromptTemplate">
            <template #trigger>
              <NButton size="small">
                {{ $t("common.clear") }}
              </NButton>
            </template>
            {{ $t("store.clearStoreConfirm") }}
          </NPopconfirm>
        </div>
        <div class="flex items-center">
          <NInput v-model:value="searchValue" style="width: 100%" />
        </div>
      </div>

      <NDataTable
        v-if="!isMobile"
        :max-height="400"
        :columns="columns"
        :data="dataSource"
        :pagination="pagination"
        :bordered="false"
      />
      <NList v-if="isMobile" style="max-height: 400px; overflow-y: auto">
        <NListItem v-for="(item, index) of dataSource" :key="index">
          <NThing :title="item.renderKey" :description="item.renderValue" />
          <template #suffix>
            <div class="flex flex-col items-center gap-2">
              <NButton
                tertiary
                size="small"
                type="info"
                @click="changeShowModal('modify', item)"
              >
                {{ t("common.edit") }}
              </NButton>
              <NButton
                tertiary
                size="small"
                type="error"
                @click="deletePromptTemplate(item)"
              >
                {{ t("common.delete") }}
              </NButton>
            </div>
          </template>
        </NListItem>
      </NList>
    </div>
  </NModal>

  <NModal
    v-model:show="showModal"
    style="width: 90%; max-width: 600px"
    preset="card"
  >
    <NSpace v-if="modalMode === 'add' || modalMode === 'modify'" vertical>
      {{ t("store.title") }}
      <NInput v-model:value="tempPromptKey" />
      {{ t("store.description") }}
      <NInput v-model:value="tempPromptValue" type="textarea" />
      <NButton
        block
        type="primary"
        :disabled="inputStatus"
        @click="
          () => {
            modalMode === 'add' ? addPromptTemplate() : modifyPromptTemplate();
          }
        "
      >
        {{ t("common.confirm") }}
      </NButton>
    </NSpace>
    <NSpace v-if="modalMode === 'local_import'" vertical>
      <NInput
        v-model:value="tempPromptValue"
        :placeholder="t('store.importPlaceholder')"
        :autosize="{ minRows: 3, maxRows: 15 }"
        type="textarea"
      />
      <NButton
        block
        type="primary"
        :disabled="inputStatus"
        @click="
          () => {
            importPromptTemplate('local');
          }
        "
      >
        {{ t("common.import") }}
      </NButton>
    </NSpace>
  </NModal>
</template>
