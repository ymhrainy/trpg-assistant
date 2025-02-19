<template>
  <div class="character-info-edit-form">
    <el-descriptions>
      <el-descriptions-item label="姓名">{{ characterInfo.name }}</el-descriptions-item>
      <el-descriptions-item label="性别">{{ characterInfo.sex }}</el-descriptions-item>
      <el-descriptions-item label="年龄">{{ characterInfo.age }}</el-descriptions-item>
      <el-descriptions-item label="职业">{{ characterInfo.class }}</el-descriptions-item>
      <el-descriptions-item label="种族">{{ characterInfo.race }}</el-descriptions-item>
      <el-descriptions-item label="亚种">{{ characterInfo.subRace }}</el-descriptions-item>
      <el-descriptions-item label="阵营">{{ characterInfo.alignment }}</el-descriptions-item>
      <el-descriptions-item label="经验">{{ characterInfo.experience }}</el-descriptions-item>
      <el-descriptions-item label="速度">{{ characterInfo.speed }}</el-descriptions-item>
      <el-descriptions-item label="最高血量">{{ characterInfo.maxHP }}</el-descriptions-item>
      <el-descriptions-item label="当前血量">{{ characterInfo.currentHP }}</el-descriptions-item>
      <el-descriptions-item label="力量">{{ characterInfo.strength }}</el-descriptions-item>
      <el-descriptions-item label="敏捷">{{ characterInfo.dexterity }}</el-descriptions-item>
      <el-descriptions-item label="体质">{{ characterInfo.constitution }}</el-descriptions-item>
      <el-descriptions-item label="智力">{{ characterInfo.intelligence }}</el-descriptions-item>
      <el-descriptions-item label="感知">{{ characterInfo.wisdom }}</el-descriptions-item>
      <el-descriptions-item label="魅力">{{ characterInfo.charisma }}</el-descriptions-item>
    </el-descriptions>
    <InfoCell prefix="熟练项">
      <div style="text-align: left">
        <div>
          技能熟练项：{{
            characterInfo.proficiencies
              .filter((p) => p.active && p.type === "skill")
              .map((e) => e.name)
              .join("，") || "无"
          }}
        </div>
        <div>
          武器熟练项：{{
            characterInfo.proficiencies
              .filter((p) => p.active && p.type === "weapon")
              .map((e) => e.name)
              .join("，") || "无"
          }}
        </div>
        <div>
          护甲熟练项：{{
            characterInfo.proficiencies
              .filter((p) => p.active && p.type === "armor")
              .map((e) => e.name)
              .join("，") || "无"
          }}
        </div>
        <div>
          豁免熟练项：{{
            characterInfo.proficiencies
              .filter((p) => p.active && p.type === "save")
              .map((e) => e.name)
              .join("，") || "无"
          }}
        </div>
        <div>
          工具熟练项：{{
            characterInfo.proficiencies
              .filter((p) => p.active && p.type === "tool")
              .map((e) => e.name)
              .join("，") || "无"
          }}
        </div>
      </div>
    </InfoCell>
    <InfoCell prefix="已准备法术">
      <SpellItem
        v-for="e in spellsPreparedInfo"
        :spell-info="e"
        @switch-description="switchDescription"
        :show-description="spellToShowDescription === e._id"
      ></SpellItem>
    </InfoCell>
    <InfoCell prefix="已知法术">
      <SpellItem
        v-for="e in spellsKnownInfo"
        :spell-info="e"
        @switch-description="switchDescription"
        :show-description="spellToShowDescription === e._id"
      ></SpellItem>
    </InfoCell>
    <InfoCell prefix="外貌描述" :text="characterInfo.appearance"></InfoCell>
    <InfoCell prefix="角色背景">
      <p
        style="text-align: left; margin: 0 0 10px 0"
        v-for="e in `${characterInfo.backgroundStory ?? ''}`.split('\n')"
      >
        {{ e }}
      </p>
    </InfoCell>
  </div>
</template>

<script lang="ts" setup>
import { type PropType, computed, ref } from "vue";
import InfoCell from "./components/InfoCell.vue";
import type { CharacterInfo, SpellInfo } from "@trpg/shared";
import SpellItem from "../components/SpellItem.vue";
import { useSocketStore } from "@/stores/useSocketStore";
import { turnToSpellsInfo } from "@/utils/index";

const props = defineProps({
  characterInfo: { type: Object as PropType<CharacterInfo>, required: true },
});

const spellsPreparedInfo = computed(() => {
  const result: SpellInfo[] = [];
  props.characterInfo.spellsPrepared.forEach((e) => {
    const spellItem = useSocketStore().allSpellInfo.find((info) => info._id === e.spellId);
    if (spellItem) {
      result.push(spellItem);
    }
  });
  return result;
});

const spellsKnownInfo = computed(() => {
  return turnToSpellsInfo(props.characterInfo.spellsKnown);
});

const spellToShowDescription = ref<string | null>(null);
function switchDescription(id: string) {
  if (spellToShowDescription.value === id) {
    spellToShowDescription.value = null;
  } else {
    spellToShowDescription.value = id;
  }
}
console.log(props.characterInfo);
</script>

<style lang="less" scoped>
.character-info-edit-form {
  overflow: auto;
  padding: 5%;
  :deep(.el-descriptions__label) {
    white-space: nowrap;
  }
}
.el-form-item {
  margin-bottom: 4px;
}

.ability-and-skills-area > div {
  display: flex;
  align-items: center;
}
</style>
