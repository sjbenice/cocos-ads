const { ccclass, property } = _decorator;
import { _decorator, animation, Camera, Collider, Component, EventMouse, EventTouch, ICollisionEvent, ITriggerEvent, Label, math, Node, NodeSpace, Quat, sys, toDegree, toRadian, v3, Vec3 } from 'cc';
import { GameMgr } from '../manager/GameMgr';
import { BackPack } from './BackPack';
import { Grain } from '../item/Grain';
import { Item } from '../item/Item';
import { AvatarController } from './AvatarController';

@ccclass('PlayerController')
export class PlayerController extends AvatarController {
    @_decorator.property
    public packSpeedFactor = 0;

    @property(Label)
    dollarLabel:Label = null;

    @property(Node)
    tutorialArrow:Node;

    protected _backPack: BackPack;
    protected _sleepMoveTimer: number = 0;
    protected _sleepMoveInterval: number = 0;

    start() {
        super.start();

        this._backPack = this.node.getComponent(BackPack);
    }

    protected doCollisionEnter(event: ICollisionEvent) {
        super.doCollisionEnter(event);

        const otherCollider = event.otherCollider;
        if (otherCollider) {
            const otherNode = otherCollider.node;
            if (otherNode) {
                if (otherCollider.getGroup() == GameMgr.PHY_GROUP.GRAIN) {
                    if (!this.isBot()) {
                        const grain:Grain = otherNode.getComponent(Grain);
                        if (grain){
                            this.catchItem(grain);
                        }
                    }
                } else if (otherCollider.getGroup() == GameMgr.PHY_GROUP.PLAYER) {
                    if (this.isBot())
                        this.sleepMove(2000);
                }
            }
        }
    }

    // protected doTriggerEnter(event: ITriggerEvent){
    //     super.doTriggerEnter(event);

    //     this.doTrigger(event.otherCollider.node);
    // }

    protected getMaxSpeed(){
        let ret = super.getMaxSpeed();
        if (this.packSpeedFactor > 0)
            ret *=  Math.max(1 - this._backPack.getGrainCount() * this.packSpeedFactor, 1 / 3);

        return ret;
    }

    protected canMove() {
        if (super.canMove()){
            if (this._sleepMoveTimer > 0){
                if (sys.now() < this._sleepMoveTimer + this._sleepMoveInterval)
                    return false;
    
                this._sleepMoveTimer = 0;
            }
            return true;
        }

        return false;
    }

    protected adjustStatus() {
        this.setAnimationValue('Heavy', this._backPack.getGrainCount() > 0);
        if (!this.isBot())
            this.showTotalDollarLabel();
    }

    protected showTotalDollarLabel() {
        if (this.dollarLabel && this._backPack)
            this.dollarLabel.string = (this._backPack.totalDollar() * 10).toString();
    }

    public dropItem(type:number, isGrain:boolean, worldPos:Vec3 = null) : Item {
        if (this._backPack){
            const ret = this._backPack.dropOne(type, isGrain, worldPos);
            if (ret) {
                ret.prepareForProduct();

                this.adjustStatus();
            }

            return ret;
        }

        return null;
    }

    public catchItem(item:Item): boolean {
        if (this._backPack){
            if (this._backPack.addItem(item)) {
                this.adjustStatus();
                return true;
            }
        }
        return false;
    }
    
    public isPackFull(isBack:boolean):boolean {
        if (this._backPack){
            return this._backPack.isFull(isBack);
        }
        return false;
    }

    public isPackEmpty(isBack:boolean):boolean {
        if (this._backPack){
            return this._backPack.isEmpty(isBack);
        }
        return false;
    }

    public getItemCount(isBack:boolean):number {
        if (this._backPack){
            return this._backPack.getItemCount(isBack);
        }
        return 0;
    }

    public hasProduct(type:number=0):boolean {
        if (this._backPack){
            return this._backPack.hasProduct(type);
        }
        return false;
    }

    // private doTrigger(node:Node) {
    //     console.log(node.name);
    // }

    public isBot() : boolean {
        return false;
    }

    public static checkPlayer(otherCollider: Collider, onlyRealPlayer:boolean = false) : PlayerController {
        if (otherCollider) {
            const otherNode = otherCollider.node;
            if (otherNode) {
                if (otherCollider.getGroup() == GameMgr.PHY_GROUP.PLAYER) {
                    const player:PlayerController = otherNode.getComponent(PlayerController);
                    if (!onlyRealPlayer || !player.isBot())
                        return player;
                }
            }
        }
        return null;
    }

    update(deltaTime: number) {
        super.update(deltaTime);

        if (this.tutorialArrow) {
            const tutorialDirection = GameMgr.getTutorialDirection(this.node.getWorldPosition());
            if (tutorialDirection) {
                this.tutorialArrow.active = true;
                if (!Vec3.equals(tutorialDirection, Vec3.ZERO)) {
                    this.faceView(tutorialDirection, deltaTime, this.tutorialArrow, 0);
                }
            } else
                this.tutorialArrow.active = false;
        }
    }

    public sleepMove(sleepMilliseconds:number):void {
        this._sleepMoveTimer = sys.now();
        this._sleepMoveInterval = sleepMilliseconds;
    }

    public onFactoryInput(enter:boolean): void {

    }

    public onFactoryOutput(enter:boolean): void {
        
    }
}


