import { _decorator, Button, Component, Node, Tween, tween, UITransform, v3, Vec2, Vec3 } from 'cc';
import super_html_playable from '../super_html_playable';
const { ccclass, property } = _decorator;

const google_play = "https://play.google.com/store/apps/details?id=com.idle.food.venture.fast";
// const appstore = "https://apps.apple.com/us/app/ad-testing/id1463016906";

@ccclass('FirstScene')
export class FirstScene extends Component {
    @property(Node)
    background:Node;

    @property(Node)
    logo:Node;

    @property(Node)
    logoEffect:Node;

    @property(Node)
    playButton:Node;

    @property(Node)
    gotoButton:Node;

    onLoad() {
        super_html_playable.set_google_play_url(google_play);
        // super_html_playable.set_app_store_url(appstore);

        // if (super_html_playable.is_hide_download()) {
        //     this.button_download.active = false;
        // }
        super_html_playable.game_end();
    }

    start() {
        if (this.logo)
            this.logo.active = false;
        if (this.logoEffect)
            this.logoEffect.active = false;
        if (this.playButton)
            this.playButton.active = false;
        if (this.gotoButton)
            this.gotoButton.active = false;

        if (this.background) {
            const temp = this.background.scale.clone();
            temp.x *= 2;
            temp.y *= 2;
            this.background.setScale(temp);
            tween(this.background)
            .to(0.3, {scale:Vec3.ONE}, {easing:'backIn',
                onComplete: (target?: object) => {
                    if (this.playButton) {
                        this.playButton.active = true;
                        this.playButton.setScale(Vec3.ZERO);
                        tween(this.playButton)
                        .to(1, {scale:Vec3.ONE}, {easing:'bounceInOut'})
                        .start();

                        tween(this.playButton)
                            .delay(1)
                            .to(0.5, { scale: v3(1.1, 1.1, 1) }, { easing: 'sineOut' })
                            .to(0.5, { scale: Vec3.ONE }, { easing: 'sineIn' })
                            .union()
                            .repeatForever()
                            .start();
                    }

                    if (this.gotoButton) {
                        this.gotoButton.active = true;
                        this.gotoButton.setScale(Vec3.ZERO);
                        tween(this.gotoButton)
                        .to(0.3, {scale:Vec3.ONE}, {easing:'bounceOut'})
                        .start();
                    }
                    
                    if (this.logo) {
                        this.logo.active = true;
                        tween(this.logo)
                        .to(0.1, {scale:v3(2, 2, 2)}, {easing:'cubicOut'})
                        .to(0.3, {scale:Vec3.ONE}, {easing:'bounceOut'})
                        .start();
                    }
                    
                    if (this.logoEffect) {
                        this.logoEffect.active = true;
                        tween(this.logoEffect)
                        .hide()
                        .delay(0.2)
                        .show()
                        .to(0.2, {scale:v3(3, 3, 3)}, {easing:'expoOut'})
                        .destroySelf()
                        .start();
                    }
                },
            })
            .start();
        }

    }

    protected onDestroy(): void {
        Tween.stopAll();
    }

    // update(deltaTime: number) {
        
    // }

    onBtnPlay() {
        if (this.playButton){
            const btn = this.playButton.getComponent(Button);
            if (btn)
                btn.enabled = false;
        }
        super_html_playable.download();
    }
}


