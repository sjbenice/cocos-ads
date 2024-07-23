

import * as cc from 'cc';
import { _decorator, sys, UITransform } from 'cc';
import { HTML5 } from 'cc/env';
import { InfinitySymbolTween } from '../../../script/util/InfinitySymbolTween';
const { ccclass, property } = _decorator;

export enum JoystickEventType {
    PRESS,
    RELEASE,
    MOVE,
}

@ccclass('Joystick')
export class Joystick extends cc.Eventify(cc.Component) {
    @property
    hideCtrlNoTouch:boolean = false;

    @property
    captureMouse:boolean = false;

    @property(InfinitySymbolTween)
    tutorHandTween:InfinitySymbolTween = null;

    multiple:number = 1;
    public backgroundRadius = 100;

    private static _instance: Joystick = null;

    get pressing () {
        return this._pressing;
    }

    get direction (): Readonly<cc.math.Vec2> {
        return this._direction;
    }

    public static isTouchDevice() {
        return sys.hasFeature(sys.Feature.INPUT_TOUCH);
    }

    onLoad() {
        if (Joystick._instance) {
            this.node.destroy();
            return;
        }
        Joystick._instance = this;
    }

    public start () {
        const uiTransform = this.getComponent(cc.UITransform);
        if (!uiTransform) {
            cc.error(`Missing component UITransform`);
            return;
        }
        this._uiTransform = uiTransform;

        const bar = this.node.getChildByName('Bar');
        if (!bar) {
            cc.error(`Missing node Bar`);
            return;
        }
        this._bar = bar;

        const background = this.node.getChildByName('Background');
        if (!background) {
            cc.error(`Missing node Background`);
            return;
        }
        this._background = background;

        this._originalPositionBar = this._bar.getPosition(new cc.math.Vec3());
        this._originalPositionBackground = this._background.getPosition(new cc.math.Vec3());

        if (!Joystick.isTouchDevice()) {
            this.node.on(cc.Node.EventType.MOUSE_DOWN, this._onMouseDown, this);
            this.node.on(cc.Node.EventType.MOUSE_MOVE, this._onMouseMove, this);
            this.node.on(cc.Node.EventType.MOUSE_UP, this._onMouseUp, this);

            cc.input.on(cc.Input.EventType.MOUSE_MOVE, this._onInputMouseMove, this);
            cc.input.on(cc.Input.EventType.MOUSE_UP, this._onClickOrTouchEnd, this);
            if (this.captureMouse && HTML5) {
                document.addEventListener('pointerlockchange', this._onPointerlockchange);
            }
        } else {
            this.node.on(cc.Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            this.node.on(cc.Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            this.node.on(cc.Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
            this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
        }

        if (this.hideCtrlNoTouch)
            this.showHideControl(false);
    }

    public onDestroy () {
        if (Joystick._instance == this)
            Joystick._instance = null;

        if (!Joystick.isTouchDevice()) {
            this.node.off(cc.Node.EventType.MOUSE_DOWN, this._onMouseDown, this);
            this.node.off(cc.Node.EventType.MOUSE_MOVE, this._onMouseMove, this);
            this.node.off(cc.Node.EventType.MOUSE_UP, this._onMouseUp, this);

            cc.input.off(cc.Input.EventType.MOUSE_MOVE, this._onInputMouseMove, this);
            cc.input.off(cc.Input.EventType.MOUSE_UP, this._onClickOrTouchEnd, this);
            if (this.captureMouse && HTML5) {
                document.removeEventListener('pointerlockchange', this._onPointerlockchange);
            }
        } else {
            this.node.off(cc.Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            this.node.off(cc.Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            this.node.off(cc.Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
            this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
        }
    }

    // public update (deltaTime: number) {
    // }

    private declare _uiTransform: cc.UITransform;
    private declare _bar: cc.Node;
    private declare _background: cc.Node;
    private declare _originalPositionBar: cc.Vec3;
    private declare _originalPositionBackground: cc.Vec3;
    private _pressing = false;
    private _direction: cc.math.Vec2 = new cc.math.Vec2();
    private _dir3D: cc.math.Vec3 = new cc.math.Vec3();

    private _onInputMouseMove(eventMouse) {
        if (Joystick._instance)
            Joystick._instance._onClickOrTouchMove(eventMouse.getDelta());
    }

    private _onPointerlockchange() {
        if (document.pointerLockElement !== cc.game.canvas) {
            if (Joystick._instance)
                Joystick._instance._onClickOrTouchEnd();
        }
    }

    private _onMouseDown (event: cc.EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case cc.EventMouse.BUTTON_LEFT:
                this._onClickOrTouch(event.getUILocationX(), event.getUILocationY());
                break;
        }
    }

    private _onMouseMove (event: cc.EventMouse) {
        this._onClickOrTouchMove(new cc.math.Vec2(event.getDeltaX(), event.getDeltaY()));
    }

    private _onMouseUp (event: cc.EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case cc.EventMouse.BUTTON_LEFT:
                this._onClickOrTouchEnd();
                break;
        }
    }

    private _onThisNodeTouchStart (touchEvent: cc.EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }
        this._onClickOrTouch(touch.getUILocationX(), touch.getUILocationY());
    }

    private _onThisNodeTouchEnd () {
        this._onClickOrTouchEnd();
    }
    
    private _onThisNodeTouchCancelled () {
        this._onThisNodeTouchEnd();
    }

    private _onThisNodeTouchMove (touchEvent: cc.EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }

        this._onClickOrTouchMove(touch.getDelta());
    }

    private _onClickOrTouch(x: number, y: number) {
        if (this.hideCtrlNoTouch)
            this.showHideControl(true);

        const localPosition = this._uiTransform.convertToNodeSpaceAR(
            new cc.math.Vec3(x, y, 0.0),
            new cc.math.Vec3(),
        );
        this._bar.setPosition(localPosition);
        this._background.setPosition(localPosition);
        this._pressing = true;

        // Check if the method exists before calling it
        if (this.captureMouse && cc.game.canvas?.requestPointerLock) {
            const maybePromise = cc.game.canvas.requestPointerLock() as unknown as Promise<unknown> | undefined;
            
            // Optionally handle the promise if it exists
            if (maybePromise instanceof Promise) {
                maybePromise.then(() => {
                    // console.log('Pointer lock request was successful.');
                }).catch((error) => {
                    // console.error('Pointer lock request failed:', error);
                });
            } else {
                // console.log('Pointer lock request is not supported.');
            }
        } else {
            // console.log('Pointer lock API is not available.');
        }

        this.emit(JoystickEventType.PRESS);
    }

    private _onClickOrTouchEnd() {
        if (this._bar && this._background) {
            this._bar.setPosition(this._originalPositionBar);
            this._background.setPosition(this._originalPositionBackground);
            this._pressing = false;
            this.emit(JoystickEventType.RELEASE);
            cc.math.Vec2.set(this._direction, 0.0, 0.0);
            globalThis.document?.exitPointerLock?.();

            this.showHideControl(false);
        }
    }

    private _onClickOrTouchMove(delta2D: cc.math.Vec2) {
        if (!this._pressing) {
            return;
        }

        if (this._background && this._bar) {
            const backgroundPosition = this._background.getPosition();

            const delta = new cc.math.Vec3(delta2D.x, delta2D.y);

            const barPosition = this._bar.getPosition(new cc.math.Vec3());
            cc.math.Vec3.add(barPosition, barPosition, delta);
            const { x, y } = clampCircular(barPosition.x, barPosition.y, backgroundPosition.x, backgroundPosition.y, this.backgroundRadius);
            cc.math.Vec3.set(barPosition, x, y, barPosition.z);
            this._bar.setPosition(barPosition);

            this._dir3D.set(barPosition);
            this._dir3D.subtract(backgroundPosition);

            const scale = this._dir3D.length() / this.backgroundRadius;

            // this._uiTransform.convertToWorldSpaceAR(dir3D, dir3D);

            this._dir3D.normalize();
            this._dir3D.multiplyScalar(scale);

            // console.log(this._uiTransform.convertToWorldSpaceAR(this._bar.position).subtract(this._uiTransform.convertToWorldSpaceAR(this._background.position)).normalize())

            cc.math.Vec2.set(this._direction, this._dir3D.x, this._dir3D.y);
            // console.log(`Move ${delta}`);
            this.emit(JoystickEventType.MOVE, this._direction);
        }
    }

    protected showHideControl(show:boolean){
        if (this._background)
            this._background.getComponent(cc.Sprite).enabled = show;
        if (this._bar)
            this._bar.getComponent(cc.Sprite).enabled = show;

        if (this.tutorHandTween){
            if (show) {
                this.tutorHandTween.stopTween();
                this.unscheduleAllCallbacks();
            }
            else if (!this.tutorHandTween.isRunning())
                this.scheduleOnce(()=>{
                    this.tutorHandTween.startTween();
            }, 3);
        }
    }
}

function clampCircular (x: number, y: number, centerX: number, centerY: number, radius: number) {
    const center = new cc.math.Vec2(centerX, centerY);
    const dir = new cc.math.Vec2(x, y);
    cc.math.Vec2.subtract(dir, dir, center);
    const distance = cc.math.Vec2.len(dir);
    const clampedDistance = cc.math.clamp(distance, 0, radius);
    cc.math.Vec2.normalize(dir, dir);
    cc.math.Vec2.scaleAndAdd(dir, center, dir, clampedDistance);
    return { x: dir.x, y: dir.y };
}