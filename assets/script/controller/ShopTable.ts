import { _decorator, Collider, Component, instantiate, ITriggerEvent, Node, Prefab, randomRange, sys, Tween, tween, v3, Vec3 } from 'cc';
import { GuestController } from './GuestController';
import { Item } from '../item/Item';
import { PlayerController } from './PlayerController';
import { GoodPackFactory } from './GoodPackFactory';
import { GameMgr } from '../manager/GameMgr';
const { ccclass, property } = _decorator;

@ccclass('ShopTable')
export class ShopTable extends Component {
    @property(Node)
    placePos:Node;
    @property(Node)
    arriveTrace:Node;
    @property
    dropInterval: number = 100; // Interval in milliseconds

    @property
    dollarPosVar:number = 0.3;

    @property(Prefab)
    dollar:Prefab;

    @property
    sellType:number = 0;
    
    guest:GuestController = null;

    private _collider : Collider;
    private _dropTimer: number = 0;
    private _totalPrice:number = 0;
    private _isDollar:boolean = false;

    private _players:PlayerController[] = [];
    private _timers:number[] = [];

    start() {
        this._collider = this.node.getComponent(Collider);
        if (!this._collider)
            this._collider = this.node.getComponentInChildren(Collider);
        if (this._collider) {
            this._collider.on('onTriggerEnter', this.onTriggerEnter, this);
            this._collider.on('onTriggerExit', this.onTriggerExit, this);
        }
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off('onTriggerEnter', this.onTriggerEnter, this);
            this._collider.off('onTriggerExit', this.onTriggerExit, this);
        }
    }

    onTriggerEnter (event: ITriggerEvent) {
        const player:PlayerController = PlayerController.checkPlayer(event.otherCollider);
        if (player){
            GoodPackFactory.registerPlayer(player, this._players, this._timers, true);
        }
    }

    onTriggerExit (event: ITriggerEvent) {
        const player:PlayerController = PlayerController.checkPlayer(event.otherCollider);
        if (player){
            GoodPackFactory.registerPlayer(player, this._players, this._timers, false);
        }
    }

    update(deltaTime: number) {
        for (let index = 0; index < this._players.length; index++) {
            const time = this._timers[index];
            if (time > 0 && sys.now() >= this.dropInterval + time) {
                const player = this._players[index];
                if (player) {
                    this.tradeItem(player);
                }
            }
        }
    }

    public arrivedGuest(guest:GuestController){
        this.guest = guest;
    }

    public getOrderType() {
        if (this.guest && this.guest.orderCount > 0)
            return this.guest.buyType;

        return -1;
    }

    public canSell() {
        return !this._isDollar;
    }

    public hasDollar() {
        return this._isDollar && this.placePos.children.length > 0;
    }

    private tradeItem(player:PlayerController){
        if (player){
            if (this.hasDollar()) {
                const element = this.placePos.children[this.placePos.children.length - 1];
                // this.placePos.removeChild(element);
                if (player.catchItem(element.getComponent(Item))){
                    Tween.stopAllByTarget(element);
                    GameMgr.playerEarnedMoney();
                }

                if (this.placePos.children.length == 0)
                    this._isDollar = false;
            }else if (this.guest) {
                if (this.guest.orderCount > 0){
                    const item:Item = player.dropItem(this.guest.buyType, false);
                    if (item){
                        let yPos:number = 0;
                        // if (this.placePos.children.length > 0){
                        //     const topItem:Item = this.placePos.children[this.placePos.children.length - 1].getComponent(Item);
                        //     if (topItem){
                        //         yPos = topItem.node.position.y + topItem.getHalfDimension().y;
                        //     }
                        // }
                        this.placePos.addChild(item.node);
                        item.node.setPosition(v3(0, yPos + item.getHalfDimension().y, 0));

                        this._totalPrice += item.price;
                        this.guest.buyOne();

                        const orgScale = item.node.scale.clone();
                        item.node.scale = Vec3.ZERO;
                        tween(item.node)
                            .to(this.dropInterval / 500, {scale : orgScale}, {easing: 'bounceInOut',
                                onComplete: (target?: object) => {
                                    this.placePos.removeChild(item.node);
                                    item.node.destroy();

                                    if ((!this.guest || this.guest.orderCount == 0) && this._totalPrice > 0){
                                        this.scheduleOnce(this.pushDollar, this.dropInterval / 1000);
                                    }
                                }
                            })
                            .start();

                        if (player.isBot())
                            GameMgr.assistantSellApple();
                    }
                }
            }
        }
    }

    pushDollar() {
        for (let index = this.placePos.children.length - 1; index >= 0; index--) {
            const element = this.placePos.children[index];
            this.placePos.removeChild(element);
            element.destroy();
        }
        if (this._totalPrice > 0) {
            this._isDollar = true;
            for (let index = 0; index < this._totalPrice; index++) {
                const element = instantiate(this.dollar);
                this.placePos.addChild(element);
                
                let targetPos:Vec3 = v3(
                    randomRange(-this.dollarPosVar, this.dollarPosVar), 
                    element.getComponent(Item).getHalfDimension().y, 
                    randomRange(-this.dollarPosVar, this.dollarPosVar));
                element.setRotationFromEuler(0, Math.random() * 90, 0);
                element.setPosition(v3(0, 1, 0));

                tween(element).to(randomRange(0.2, 0.4), {position:targetPos}, {easing:'expoIn'}).start();
            }
            this._totalPrice = 0;
        }
    }
}


