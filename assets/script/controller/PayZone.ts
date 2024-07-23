import { _decorator, Collider, Component, EAxisDirection, ITriggerEvent, Node, sys, Tween, tween, v3, Vec3 } from 'cc';
import { PlayerController } from './PlayerController';
import { Item } from '../item/Item';
import { Boundary } from '../util/Boundary';
import { ParabolaTween } from '../util/ParabolaTween';
const { ccclass, property } = _decorator;

@ccclass('PayZone')
export class PayZone extends Component {
    @property
    price: number = 10;

    @property
    dropInterval: number = 200; // Interval in milliseconds
    @property
    effectScale: number = 0.5;
    @property(Node)
    progress: Node;
    @property({ type: EAxisDirection })
    progressDirection: EAxisDirection = EAxisDirection.X_AXIS;

    @property(Node)
    payZone:Node = null;
    @property(Node)
    unlockPayZone: Node;
    @property(Node)
    priceMark: Node;
    @property(Node)
    lockMark: Node;

    private _collider:Collider = null;
    private _dropTimer: number = 0;
    private _paied:number = 0;
    private _scaleTo:Vec3 = null;
    private _scaleFrom:Vec3 = null;
    private _progressOrgScale:Vec3 = null;
    private _isTweenRunning:boolean = false;

    private _progressDimension:Vec3 = null;

    private _player:PlayerController = null;

    start() {
        this._collider = this.node.getComponent(Collider);
        if (this._collider == null)
            this._collider = this.node.getComponentInChildren(Collider);

        if (this._collider) {
            this._collider.on('onTriggerEnter', this.onTriggerEnter, this);
            this._collider.on('onTriggerExit', this.onTriggerExit, this);
        }

        this._progressOrgScale = this.progress.scale.clone();

        this._scaleFrom = this.node.scale.clone();
        this._scaleTo = this.node.scale.clone();
        this._scaleTo.x *= this.effectScale;
        this._scaleTo.z *= this.effectScale;

        this._progressDimension = Boundary.getMeshDimension(this.progress, true);

        this.prepare(true);
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off('onTriggerEnter', this.onTriggerEnter, this);
            this._collider.off('onTriggerExit', this.onTriggerExit, this);
        }
    }

    onTriggerEnter (event: ITriggerEvent) {
        if (this.isLocked()) return;

        const player:PlayerController = PlayerController.checkPlayer(event.otherCollider, true);
        if (player){
            this._player = player;
            this._dropTimer = sys.now();
        }
    }

    onTriggerExit (event: ITriggerEvent) {
        if (this.isLocked()) return;

        const player:PlayerController = PlayerController.checkPlayer(event.otherCollider, true);
        if (player && this._player == player){
            this._player = null;
        }
    }

    public getRemainedPrice() {
        return this.price - this._paied;
    }

    public prepare(force:boolean=false) {
        if (!this.node.active || force){
            this.node.active = true;

            this._paied = 0;

            Tween.stopAllByTarget(this.node);
            this._isTweenRunning = false;

            this.showProgress();

            this.lock(true);
        }
    }

    public lock(isLock:boolean) {
        if (this.lockMark) {
            if (this.priceMark)
                this.priceMark.active = !isLock;
            this.lockMark.active = isLock;
        }
    }

    public isLocked() {
        return this.lockMark && this.lockMark.active;
    }
    
    private doUpgrade(){
        if (this._paied < this.price && this._player) {
            const worldPos:Vec3 = v3(0, 0, 0);
            const item:Item = this._player.dropItem(0, false, worldPos);
            if (item){
                if (this.payZone){
                    this.payZone.addChild(item.node);
                    item.node.setWorldPosition(worldPos);
                    ParabolaTween.moveNodeParabola(item.node, Vec3.ZERO, 2, 
                        0.15, 0.5, 360, true);
                }else
                    item.destroy();

                this._paied ++;

                if (!this._isTweenRunning){
                    this._isTweenRunning = true;
                    tween(this.node)
                        .to(0.1, {scale:this._scaleTo}, { easing: 'bounceIn' })
                        .to(0.1, {scale:this._scaleFrom}, { easing: 'bounceOut' })
                        .union()
                        .call(() => {
                            // Set the flag to false when the tween completes
                            this._isTweenRunning = false;
                        })
                        .start()
                }

                this.showProgress();

                if (this.isCompleted()) {
                    this.node.active = false;
                    if (this.unlockPayZone)
                        this.unlockPayZone.getComponent(PayZone).lock(false);
                    this._player = null;
                }
            } else
                this._player = null;
        }
    }

    public isCompleted() : boolean {
        return this._paied == this.price;
    }

    private showProgress() {
        const pos = this.progress.position;
        const scale = this._paied / this.price;

        switch (this.progressDirection) {
            case EAxisDirection.X_AXIS:
                this.progress.setScale(this._progressOrgScale.x * scale, this._progressOrgScale.y, this._progressOrgScale.z);
                this.progress.setPosition(- (1 - scale) * this._progressDimension.x /2, pos.y, pos.z);
                break;
            case EAxisDirection.Y_AXIS:
                this.progress.setScale(this._progressOrgScale.x, this._progressOrgScale.y * scale, this._progressOrgScale.z);
                this.progress.setPosition(pos.x, - (1 - scale) * this._progressDimension.y / 2, pos.z);
                break;
            case EAxisDirection.Z_AXIS:
                this.progress.setScale(this._progressOrgScale.x, this._progressOrgScale.y, this._progressOrgScale.z * scale);
                this.progress.setPosition(pos.x, pos.y, - (1 - scale) * this._progressDimension.z / 2);
                break;
        }
    }

    update(deltaTime: number) {
        if (!this.isLocked() && this._player && sys.now() > this._dropTimer + this.dropInterval) {
            this.doUpgrade();
            this._dropTimer = sys.now();
        }
    }
}


