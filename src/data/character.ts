export interface CharacterModel {
  id: string;
  name: string;
  thumb?: string;
  rigId?: string;
  platform?: string;
  ctime?: number;
  mtime?: number;
}

export namespace CharacterModel {
  export function fromDict(data: any): CharacterModel {
    return {
      id: data.id || data.Id || '',
      name: data.name || '',
      thumb: data.thumb,
      rigId: data.rigId,
      platform: data.platform,
      ctime: data.ctime,
      mtime: data.mtime
    };
  }
}
