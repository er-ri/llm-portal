import { ss } from '@/utils/storage'

const LOCAL_NAME = 'userStorage'

export interface UserInfo {
  avatar: string
  name: string
  description: string
  openaiApiKey: string
}

export interface UserState {
  userInfo: UserInfo
}

export function defaultSetting(): UserState {
  return {
    userInfo: {
      avatar: 'https://avatars.githubusercontent.com/u/50995184?v=4',
      name: 'er-ri',
      description: 'Repository <a href="https://github.com/er-ri/llm-portal" class="text-blue-500" target="_blank" >GitHub</a>',
      openaiApiKey: 'OpenAI API Key'
    },
  }
}

export function getLocalState(): UserState {
  const localSetting: UserState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: UserState): void {
  ss.set(LOCAL_NAME, setting)
}
