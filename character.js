import { BufferStream } from './buffer.js';
import { LOCATION } from './structs/core.js';
import { AcsCharacterInfo } from './structs/character.js';
import { AcsAnimationEntry } from './structs/animation.js';
import { AcsImageEntry } from './structs/image.js';
import { Agent } from './agent.js';

export class AcsData {
    constructor() {
        this.characterInfo = new AcsCharacterInfo();
        this.animInfo = [];
        this.images = [];
    }
}

const acsDataCache = new Map();

export function agentPurgeACSCache() {
    acsDataCache.clear();
}

export function agentCharacterParseACS(buffer) {
    if (buffer.readU32LE() !== 0xabcdabc3) {
        throw new Error('Invalid ACS data');
    }

    const acsData = new AcsData();
    const locations = {
        characterInfo: LOCATION.read(buffer),
        animationInfo: LOCATION.read(buffer),
        imageInfo: LOCATION.read(buffer),
        audioInfo: LOCATION.read(buffer)
    };

    buffer.withOffset(locations.characterInfo.offset, () => {
        acsData.characterInfo = AcsCharacterInfo.read(buffer);
    });

    buffer.withOffset(locations.animationInfo.offset, () => {
        acsData.animInfo = buffer.readCountedList(() => 
            AcsAnimationEntry.read(buffer)
        );
    });

    buffer.withOffset(locations.imageInfo.offset, () => {
        acsData.images = buffer.readCountedList(() => 
            AcsImageEntry.read(buffer)
        );
    });

    return acsData;
}

export function agentCreateCharacter(data) {
    return new Agent(data);
}

export async function agentCreateCharacterFromUrl(url) {
    if (acsDataCache.has(url)) {
        return agentCreateCharacter(acsDataCache.get(url));
    }

    try {
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        const buffer = new Uint8Array(data);
        const acsData = agentCharacterParseACS(new BufferStream(buffer));

        acsDataCache.set(url, acsData);
        return agentCreateCharacter(acsData);
    } catch (error) {
        console.error('Character creation failed:', error);
        throw error;
    }
}
