import { _decorator, CCInteger, Component, director, instantiate, Node, Prefab, Quat, Toggle, toRadian, Tween, tween, v3, Vec3 } from 'cc';
import { SoundMgr } from './SoundMgr';
import { GuestController } from '../controller/GuestController';
import { ShopTable } from '../controller/ShopTable';
import { PlayerController } from '../controller/PlayerController';
import { PayZone } from '../controller/PayZone';
import { GoodPackFactory } from '../controller/GoodPackFactory';
import { Utils } from '../util/Utils';
const { ccclass, property } = _decorator;

@ccclass('GameMgr')
export class GameMgr extends Component {
    static PHY_GROUP = {
        DEFAULT: 1 << 0,
        PLANE: 1 << 1,
        PLAYER: 1 << 2,
        GRAIN: 1 << 3,
        TRIGGER: 1 << 4,
    };

    static VERSION = {
        EARN_MONEY: 1,
        ASSISTANT_SELL_APPLE: 2,
        BUY_CORN_FIELD: 3,
    };

    @property(Node)
    shopTables:Node[] = [];

    @property(Prefab)
    guestSamples:Prefab[] = [];

    @property(CCInteger)
    buyTypes:number[] = [];

    @property(Node)
    tutorialPoints:Node[] = [];

    @property(Node)
    tutorialArrow:Node;
    
    @property(Node)
    playerNode:Node = null;

    @property(Node)
    firstPayZone:Node = null;

    @property(GoodPackFactory)
    appleFactory:GoodPackFactory = null;

    private _player:PlayerController = null;

    static State = {
        SPLASH: -1,
        CROP_APPLE: 0,
        INPUT_APPLE: 1,
        OUTPUT_APPLE: 2,
        SELL_APPLE: 3,
        BUY_CONVEYER_APPLE: 4,
        BUY_ASSISTANT: 5,
        BUY_CORN_FACTORY: 6,
        BUY_CORN_FIELD: 7,
        END: 8,
    };

    protected static _tutorialRangeSqrt:number = 4;
    private static _instance: GameMgr = null;

    private _state: number = GameMgr.State.SPLASH;
    private _buyState: number = GameMgr.State.SPLASH;

    private _targetPos:Vec3 = v3(0, 0, 0);
    private _targetPos1:Vec3 = v3(0, 0, 0);
    private _targetPos2:Vec3 = v3(0, 0, 0);
    private _tutorialDirection:Vec3 = v3(0, 0, 0);

    private _shopTables:ShopTable[] = [];
    private _version:number = 0;
    
    onLoad() {
        if (GameMgr._instance) {
            this.node.destroy();
            return;
        }

        GameMgr._instance = this;
        director.addPersistRootNode(this.node);

        this._version = parseInt(Utils.getUrlParameter('version'), 10);
        if (!this._version)
            this._version = GameMgr.VERSION.BUY_CORN_FIELD;
        console.log(this._version);
    }

    protected onDestroy(): void {
        if (GameMgr._instance == this)
            GameMgr._instance = null;
    }

    public static getTutorialDirection(curPos:Vec3) {
        if (GameMgr._instance) {
            GameMgr._instance._tutorialDirection.set(GameMgr._instance._targetPos);
            GameMgr._instance._tutorialDirection.subtract(curPos);
            GameMgr._instance._tutorialDirection.y = 0;
            if (GameMgr._instance._tutorialDirection.lengthSqr() < GameMgr._tutorialRangeSqrt)
                return null;

            GameMgr._instance._tutorialDirection.normalize();

            return GameMgr._instance._tutorialDirection;
        }

        return null;
    }

    public static playerEarnedMoney() {
        if (GameMgr._instance && GameMgr._instance._version == GameMgr.VERSION.EARN_MONEY)
            GameMgr._instance.gotoFirstScene();
    }

    public static assistantSellApple() {
        if (GameMgr._instance && GameMgr._instance._version == GameMgr.VERSION.ASSISTANT_SELL_APPLE)
            GameMgr._instance.gotoFirstScene();
    }

    protected movePlayerOutRange(origin:Vec3) : boolean{
        origin.y = 0;
        if (this._player) {
            const curPos = this._player.node.getWorldPosition();
            curPos.subtract(origin);
            curPos.y = 0;
            if (curPos.lengthSqr() < GameMgr._tutorialRangeSqrt) {
                curPos.normalize();
                curPos.multiplyScalar(Math.sqrt(GameMgr._tutorialRangeSqrt));

                curPos.add(origin);
                this._player.node.setWorldPosition(curPos);

                return true;
            }
        }
        return false;
    }

    start() {
        SoundMgr.setPref(true, 0);
        SoundMgr.setPref(false, 0);

        if (this.shopTables) {
            for (let index = 0; index < this.shopTables.length; index++) {
                const shop:ShopTable = this.shopTables[index].getComponent(ShopTable);

                this._shopTables.push(shop);

                const guest:Node = instantiate(this.guestSamples[Math.floor(Math.random() * this.guestSamples.length)]);
                this.node.addChild(guest);

                guest.getComponent(GuestController).setParams(this.buyTypes, shop);
            }
        }

        if (this.tutorialArrow){
            const q = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, toRadian(180));
            tween(this.tutorialArrow).to(2, {rotation:q}, {easing:'linear'}).repeatForever().start();
        }

        if (this.playerNode)
            this._player = this.playerNode.getComponent(PlayerController);

        this.setState(GameMgr.State.CROP_APPLE);
    }

    protected setState(state:number) {
        if (state != this._state){
            this._state = state;

            if (this.tutorialArrow && this.tutorialPoints && state < this.tutorialPoints.length) {
                Tween.stopAllByTarget(this.tutorialArrow);

                this.tutorialPoints[state].getWorldPosition(this._targetPos);
                this._targetPos.y = 1.3;
                this._targetPos1.set(this._targetPos);
                this._targetPos1.y -= 0.3;
                this.tutorialArrow.setWorldPosition(this._targetPos);

                tween(this.tutorialArrow)
                .to(0.5, {position:this._targetPos1}, {easing:'quadInOut'})
                .to(0.5, {position:this._targetPos}, {easing:'quadInOut'})
                .union()
                .repeatForever()
                .start();
            }
        }
    }

    protected dealPayState(state:number) : boolean {
        if (this.firstPayZone && !this.firstPayZone.active) {
            const payZone:PayZone = this.firstPayZone.getComponent(PayZone);
            if (payZone)
                this.firstPayZone = payZone.unlockPayZone;
            
            this._buyState = state;
            this.setState(GameMgr.State.SELL_APPLE);

            return true;
        }

        return false;
    }

    protected checkFetchDollar() : boolean {
        if (!this._player.isPackFull(true)) {
            let dollar:boolean = false;
            for (let index = 0; index < this._shopTables.length; index++) {
                const shop = this._shopTables[index];
                if (shop.hasDollar()){
                    dollar = true;
                    break;
                }
            }
            if (dollar)
                return true;
        }

        return false;
    }

    update(deltaTime: number) {
        if (this._player) {
            let price = 0;
            if (this.firstPayZone) {
                if (this.firstPayZone.active) {
                    const payZone:PayZone = this.firstPayZone.getComponent(PayZone);
                    if (payZone) {
                        price = payZone.getRemainedPrice();
                        if (this._buyState < GameMgr.State.BUY_CONVEYER_APPLE && 
                            payZone.isLocked() && this._player.getItemCount(true) >= price){
                            payZone.lock(false);
                            this._buyState = GameMgr.State.BUY_CONVEYER_APPLE;
                        }
                    }
                }
                if (this._buyState >= GameMgr.State.BUY_CONVEYER_APPLE)
                    this.setState(price == 0 || this._player.getItemCount(true) > 0 ? this._buyState : GameMgr.State.OUTPUT_APPLE);
            }
    
            // if (price == 0 || this._player.getItemCount(true) >= price)
            //     this.setState(this._buyState);

            switch (this._state) {
                case GameMgr.State.CROP_APPLE:
                    if (this._player.hasProduct())
                        this.setState(GameMgr.State.OUTPUT_APPLE);
                    else if (!this._player.isPackEmpty(false))
                        this.setState(GameMgr.State.INPUT_APPLE);
                    break;
                case GameMgr.State.INPUT_APPLE:
                    if (this._player.isPackEmpty(false) || this._player.hasProduct())
                        this.setState(GameMgr.State.OUTPUT_APPLE);
                    break;
                case GameMgr.State.OUTPUT_APPLE:
                    if (this._buyState >= GameMgr.State.BUY_CORN_FACTORY || this._player.hasProduct() || this.checkFetchDollar())
                        this.setState(GameMgr.State.SELL_APPLE);
                    else if (!this._player.isPackEmpty(false))
                        this.setState(GameMgr.State.INPUT_APPLE);
                    else if (this._buyState <= GameMgr.State.BUY_CONVEYER_APPLE && this.appleFactory && !this.appleFactory.hasProduct())
                        this.setState(GameMgr.State.CROP_APPLE);
                    break;
                case GameMgr.State.SELL_APPLE:
                    if (this._buyState < GameMgr.State.BUY_CORN_FACTORY) {
                        if (!this.checkFetchDollar() && !this._player.hasProduct())
                            this.setState(GameMgr.State.OUTPUT_APPLE);
                    }
                    break;
        
                case GameMgr.State.BUY_CONVEYER_APPLE:
                    this.dealPayState(GameMgr.State.BUY_ASSISTANT);
                    break;
                case GameMgr.State.BUY_ASSISTANT:
                    this.dealPayState(GameMgr.State.BUY_CORN_FACTORY);
                    break;
                case GameMgr.State.BUY_CORN_FACTORY:
                    this._targetPos2.set(GameMgr._instance._targetPos);

                    if (this.dealPayState(GameMgr.State.BUY_CORN_FIELD)){
                        this.movePlayerOutRange(this._targetPos2);
                    }
                    break;
                case GameMgr.State.BUY_CORN_FIELD:
                    if (this.dealPayState(GameMgr.State.END)) {
                        this.setState(GameMgr.State.END);
                        this.gotoFirstScene();
                    }
                    break;
            }
        }
    }

    public gotoFirstScene() {
        this.scheduleOnce(()=>{
            const scheduler = director.getScheduler();
            scheduler.unscheduleAll();
            Tween.stopAll();

            this._state = GameMgr.State.SPLASH;

            this.node.destroy();

            SoundMgr.destroyMgr();
            director.loadScene("first");
        }, 2);
    }

    onToggleSound(target: Toggle) {
        SoundMgr.setPref(true, target.isChecked ? 1 : 0);
        SoundMgr.setPref(false, target.isChecked ? 1 : 0);
    }
}


