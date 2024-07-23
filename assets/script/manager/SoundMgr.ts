import { _decorator, assetManager, AudioClip, AudioSource, Component, director, game, sys } from "cc";
const { ccclass, property } = _decorator;

@ccclass('SoundMgr')
export class SoundMgr extends Component{
    @property(AudioSource)
    public audioSource: AudioSource | null = null;

    private static _instance: SoundMgr = null;
    
    private static _cachedAudioClipMap: Record<string, AudioClip> = {};

    private static _musicVolume: number = 0;
    private static _soundVolume: number = 0;
    private static _musicPref = "musicVolume";
    private static _soundPref = "soundVolume";

    protected static _zeroVolume:number = 0.01;

    onLoad() {
        if (SoundMgr._instance) {
            this.node.destroy();
            return;
        }

        SoundMgr._instance = this;
        director.addPersistRootNode(this.node);

        if (this.audioSource == null)
            this.audioSource = this.node.getComponent(AudioSource);

        if (this.audioSource == null)
            this.audioSource = this.node.addComponent(AudioSource);
        
        const musicPref = sys.localStorage.getItem(SoundMgr._musicPref);
        if (musicPref)
            SoundMgr._musicVolume = parseFloat(musicPref);

        const soundPref = sys.localStorage.getItem(SoundMgr._soundPref);
        if (soundPref)
            SoundMgr._soundVolume = parseFloat(soundPref);
    }

    protected onDestroy(): void {
        if (SoundMgr._instance == this)
            SoundMgr._instance = null;
    }

    public static destroyMgr() {
        if (SoundMgr._instance)
            SoundMgr._instance.node.destroy();
    }

    public static setPref(musicOrSound:boolean, volume:number){
        sys.localStorage.setItem(musicOrSound ? SoundMgr._musicPref : SoundMgr._soundPref, volume);
        if (musicOrSound){
            SoundMgr._musicVolume = volume;
            if (volume > SoundMgr._zeroVolume)
                this.playMusic();
            else
                this.stopMusic();
        } else {
            SoundMgr._soundVolume = volume;
        }
    }

    public static getPref(musicOrSound:boolean) : number {
        return musicOrSound ? SoundMgr._musicVolume : SoundMgr._soundVolume;
    }

    public static playMusic (clip: AudioClip = null) {
        if (SoundMgr._instance){
            SoundMgr.stopMusic();

            const audioSource = SoundMgr._instance.audioSource!;
            if (clip)
                audioSource.clip = clip;

            if (audioSource.clip){
                audioSource.loop = true;
                audioSource.volume = SoundMgr._musicVolume;
                audioSource.play();
            }
        }
    }

    public static stopMusic () {
        if (SoundMgr._instance){
            const audioSource = SoundMgr._instance.audioSource!;
            if (audioSource.playing) {
                audioSource.stop();
            }
        }
    }

    public static playSound(name: string) {
        if (SoundMgr._soundVolume < SoundMgr._zeroVolume || SoundMgr._instance == null)
            return;

        const audioSource = SoundMgr._instance.audioSource!;

        const path = `audio/sound/${name}`;
        let cachedAudioClip = SoundMgr._cachedAudioClipMap[path];
        if (cachedAudioClip) {
            audioSource.playOneShot(cachedAudioClip, SoundMgr._soundVolume);
        } else {
            assetManager.resources?.load(path, AudioClip, (err, clip) => {
                if (err) {
                    console.warn(err);
                    return;
                }
                
                SoundMgr._cachedAudioClipMap[path] = clip;
                audioSource.playOneShot(clip, SoundMgr._soundVolume);
            });
        }
    }
}


