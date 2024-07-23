import { _decorator, Collider, Component, director, game, ICollisionEvent, instantiate, ITriggerEvent, Node, ParticleSystem, Prefab, randomRange, sys, Tween, tween, v3, Vec3 } from 'cc';
import { SoundMgr } from '../manager/SoundMgr';
import { GameMgr } from '../manager/GameMgr';
import { PlayerController } from './PlayerController';
import { Item } from '../item/Item';
import { PayZone } from './PayZone';
import { Field } from '../item/Field';
import { Grain } from '../item/Grain';
const { ccclass, property } = _decorator;

@ccclass('GoodPackFactory')
export class GoodPackFactory extends Component {
    @property(Node)
    factory:Node;
    @property(PayZone)
    factoryPay:PayZone;

    @property(Node)
    conveyer:Node;
    @property(Node)
    startConveyerPos:Node;
    @property(Node)
    endConveyerPos:Node;
    @property(PayZone)
    conveyerPay:PayZone;
    @property
    conveyerLong:number = 2;
    @property
    conveyerInterval:number = 500;// milliseconds

    @property(Node)
    inputPallete:Node;

    @property(Node)
    inputPos:Node;
    @property(Node)
    productPos:Node;
    @property(Node)
    outputPos:Node;

    @property(Field)
    srcField:Field;

    @property(Prefab)
    inputItem:Prefab;

    @property(Prefab)
    outputItem:Prefab;

    @property
    arrangeYPos:number = 0;

    @property
    productPeriod:number = 1;
    @property
    productMax:number = 10;

    private _canWork:boolean = false;
    private _inType:number = 0;

    @property({ unit: 'milliseconds' })
    dropInterval: number = 100; // Interval in milliseconds
    @property({ unit: 'milliseconds' })
    fetchInterval: number = 100; // Interval in milliseconds

    @property(ParticleSystem)
    effect:ParticleSystem = null;

    @property(Collider)
    inTrigger:Collider;

    @property(Collider)
    outTrigger:Collider;

    private _outPackCount:number = 0;
    private _isProducting:boolean = false;
    private _conveyerWorking:boolean = false;
    private _productStart:Vec3;
    private _productEnd:Vec3;

    private _conveyerTimer: number = 0;

    private _inputPlayers:PlayerController[] = [];
    private _outputPlayers:PlayerController[] = [];
    private _inputTimers:number[] = [];
    private _outputTimers:number[] = [];

    start() {
        const inItem:Node = instantiate(this.inputItem);
        this._inType = inItem.getComponent(Item).type;
        inItem.destroy();

        this._productStart = this.productPos.position.clone();
        this._productEnd = this._productStart.clone();
        
        if (this.outputItem) {
            const outItem:Node = instantiate(this.outputItem);
            this._outPackCount = outItem.getComponent(Item).count;
            const itemHalfHeght:number = outItem.getComponent(Item).getHalfDimension().y;
            this._productStart.y += itemHalfHeght;
            this._productEnd.x -= 0.5;
            this._productEnd.y = this._productStart.y;
            outItem.destroy();
        }

        if (this.inTrigger) {
            this.inTrigger.on('onTriggerEnter', this.onInTriggerEnter, this);
            this.inTrigger.on('onTriggerExit', this.onInTriggerExit, this);
        }

        if (this.outTrigger) {
            this.outTrigger.on('onTriggerEnter', this.onOutTriggerEnter, this);
            this.outTrigger.on('onTriggerExit', this.onOutTriggerExit, this);
        }

        this.setWorkingState(!this.factoryPay);
    }

    onDestroy() {
        try {
            // this.inputPos's components is null!
            if (this.inTrigger) {
                this.inTrigger.off('onTriggerEnter', this.onInTriggerEnter, this);
                this.inTrigger.off('onTriggerExit', this.onInTriggerExit, this);
            }
    
            if (this.outTrigger) {
                this.outTrigger.off('onTriggerEnter', this.onOutTriggerEnter, this);
                this.outTrigger.off('onTriggerExit', this.onOutTriggerExit, this);
            }
        }catch(e){

        }
    }

    canWork(): boolean {
        return this._canWork;
    }

    public static registerPlayer(player:PlayerController, players:PlayerController[], timers:number[], isRegister:boolean) {
        if (player){
            let index = players.indexOf(player);
            if (index < 0) {
                players.push(player);
                timers.push(0);
                index = timers.length - 1;
            }
            timers[index] = isRegister ? sys.now() : 0;
        }
    }

    protected processPlayers(players:PlayerController[], timers:number[], isInput:boolean) {
        for (let index = 0; index < players.length; index++) {
            const time = timers[index];
            if (time > 0 && sys.now() >= this.dropInterval + time) {
                const player = players[index];
                if (player) {
                    if (isInput) {
                        const item:Item = player.dropItem(this._inType, true);
                        if (item){
                            item.stopScaleEffect();
                            item.scaleItem4palette();
                            this.arrange(item, this.inputPos);
                        }
                    } else {
                        if (this.outputPos.children.length > 0){
                            const item:Item = this.outputPos.children[this.outputPos.children.length - 1].getComponent(Item);
                            // this.outputPos.removeChild(item.node);
                            item.stopScaleEffect();
                            player.catchItem(item);
                        }
                    }
                }
            }
        }
    }

    onInTriggerEnter(event: ITriggerEvent) {
        if (this.canWork()){
            const player:PlayerController = PlayerController.checkPlayer(event.otherCollider);
            if (player){
                GoodPackFactory.registerPlayer(player, this._inputPlayers, this._inputTimers, true);

                player.onFactoryInput(true);
            }
        }
    }

    onInTriggerExit(event: ITriggerEvent) {
        const player:PlayerController = PlayerController.checkPlayer(event.otherCollider);
        if (player){
            GoodPackFactory.registerPlayer(player, this._inputPlayers, this._inputTimers, false);

            player.onFactoryInput(false);
        }
    }

    onOutTriggerEnter(event: ITriggerEvent) {
        if (this.canWork()){
            const player:PlayerController = PlayerController.checkPlayer(event.otherCollider);
            if (player){
                GoodPackFactory.registerPlayer(player, this._outputPlayers, this._outputTimers, true);

                player.onFactoryOutput(true);
            }
        }
    }

    onOutTriggerExit(event: ITriggerEvent) {
        const player:PlayerController = PlayerController.checkPlayer(event.otherCollider);
        if (player){
            GoodPackFactory.registerPlayer(player, this._outputPlayers, this._outputTimers, false);

            player.onFactoryOutput(false);
        }
    }

    private arrange(item:Item, pos:Node) {
        const collider: Collider = pos.getComponent(Collider);
        if (collider) {
            const dimen: Vec3 = collider.worldBounds.halfExtents;
            const itemDimen: Vec3 = item.getHalfDimension();
            const rows : number = Math.floor(dimen.z / itemDimen.z);
            const cols : number = Math.floor(dimen.x / itemDimen.x);

            pos.addChild(item.node);

            let index: number = pos.children.length - 1;
            const y:number = Math.floor(index / (rows * cols)) * itemDimen.y * 2 + itemDimen.y + this.arrangeYPos;
            index = index % (rows * cols);
            const z:number = Math.floor(index / cols) * itemDimen.z * 2 + itemDimen.z - rows * itemDimen.z;
            const x:number = Math.floor(index % cols) * itemDimen.x * 2 + itemDimen.x - cols * itemDimen.x;

            item.node.setPosition(v3(x, y, z));

            if (pos.active)
                item.scaleEffect(randomRange(0.2, 0.4));
        }
    }

    public hasProduct() : boolean {
        return this.outputPos.children.length > 0;
    }

    public isProducting() : boolean {
        return this._isProducting;
    }
    
    protected isMaxProduct() : boolean {
        return this.productMax > 0 && this.outputPos.children.length >= this.productMax;
    }

    protected showEffect() {
        if (this.effect){
            this.effect.stop();
            this.effect.play();
            const subEffect = this.effect.node.getComponentInChildren(ParticleSystem);
            if (subEffect){
                subEffect.stop();
                subEffect.play();
            }
        }
    }

    update(deltaTime: number) {
        if (this.canWork()) {
            if (this._isProducting == false && 
                this.inputPos.children.length >= this._outPackCount &&
                !this.isMaxProduct() && this.outputItem) {
                for (let index = 0; index < this._outPackCount; index++) {
                    const element = this.inputPos.children[this.inputPos.children.length - 1];
                    element.removeFromParent();
                    element.destroy();                
                }
                this._isProducting = true;
                const outItem:Node = instantiate(this.outputItem);
                outItem.setPosition(this._productStart);
                this.node.addChild(outItem);
                tween(outItem)
                    .to(this.productPeriod, { position: this._productEnd}, 
                        {
                            easing: 'linear',
                            onComplete: (target?: object) => {
                                this.arrange(outItem.getComponent(Item), this.outputPos);
                                // const worldPos:Vec3 = outItem.getWorldPosition();

                                // outItem.setParent(this.outputPos);
                                // outItem.setWorldPosition(worldPos);
    
                                // let pos:Vec3 = outItem.position.clone();
                                // const itemHalfHeght:number = outItem.getComponent(Item).getHalfDimension().y;
                                // pos.y = this.arrangeYPos + itemHalfHeght + (outItem.getParent().children.length - 1) * itemHalfHeght * 2;
                                // outItem.setPosition(pos);
    
                                this._isProducting = false;
                            },
                         })
                    .start();
            }

            if (this.conveyerPay && this.conveyerPay.isCompleted() && !this.conveyer.active) {
                this.inputPos.active = false;
                this.inputPallete.active = false;
                this.conveyer.active = true;

                this.showEffect();

                const orgScale = this.conveyer.scale.clone();
                this.conveyer.setScale(Vec3.ZERO);
                tween(this.conveyer)
                    .to(0.5, {scale: orgScale}, {easing: 'bounceInOut',
                        onComplete: (target?: object) => {
                            this._conveyerWorking = true;
                        },
                     })
                     .start();
            }

            if (this._conveyerWorking && this.srcField && !this.isMaxProduct() &&
                sys.now() >= this.conveyerInterval + this._conveyerTimer) {
                const grain:Grain = this.srcField.popOne();
                if (grain){
                    grain.ajudstItem();
                    grain.prepareForProduct();

                    this.startConveyerPos.addChild(grain.node);
                    grain.node.setPosition(v3(0, grain.getHalfDimension().y, 0));
                    const endPos = this.endConveyerPos.position.clone();
                    endPos.y = grain.node.position.y;
                    endPos.z = randomRange(-0.1, 0.1);
                    tween(grain.node)
                        .to(this.conveyerLong, {position: this.endConveyerPos.position}, {easing: 'linear',
                            onComplete: (target?: object) => {
                                grain.node.removeFromParent();
                                this.arrange(grain, this.inputPos);
                            },
                        })
                        .start();
                    this._conveyerTimer = sys.now();
                }    
            }

            this.processPlayers(this._inputPlayers, this._inputTimers, true);
            this.processPlayers(this._outputPlayers, this._outputTimers, false);
        } else {
            if (this.factoryPay && this.factoryPay.isCompleted() && !this.factory.active) {
                this.showEffect();

                this.factory.active = true;
                const orgScale = this.factory.scale.clone();
                const orgPosition = this.factory.position.clone();
                const tempPosition = orgPosition.clone();
                tempPosition.y += 1;
                this.factory.setPosition(tempPosition);
                this.factory.setScale(Vec3.ZERO);
                tween(this.factory)
                    .to(0.5, {scale: orgScale}, {easing: 'bounceInOut',
                        onComplete: (target?: object) => {
                            this.setWorkingState(true);
                        },
                    })
                    .to(0.2, {position:orgPosition}, {easing:'bounceInOut'})
                    .union()
                    .start();
            }
        }
    }

    protected setWorkingState(working:boolean){
        this._canWork = working;
        this.factory.active = working;
        this.inputPos.active = working;
        this.outputPos.active = working;
        
        if (this.conveyer)
            this.conveyer.active = false;
    }
}


