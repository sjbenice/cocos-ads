import { _decorator, Component, Node, Vec3 } from 'cc';
import { PlayerController } from './PlayerController';
import { ShopTable } from './ShopTable';
const { ccclass, property } = _decorator;

@ccclass('AssistantController')
export class AssistantController extends PlayerController{
    static State = {
        WAIT: 0,
        TO_FACTORY_APPLE: 1,
        GET_PRODUCT_APPLE: 2,
        TO_SHOP: 3,
        SELLING: 4,
        RETURN: 5,
    };

    @property
    sellCount:number = 5;
    @property(Node)
    shops:Node = null;
    @property(Node)
    appleOutput:Node = null;
    @property(Node)
    payZone:Node=null;

    protected _sellCount:number = 0;
    protected _state:number = AssistantController.State.WAIT;
    protected _orgPos:Vec3 = null;
    protected _appleOutputPos:Vec3 = null;
    protected _targetShopPos:Vec3 = Vec3.ZERO.clone();

    private _moveInput:Vec3 = Vec3.ZERO.clone();

    public isBot() : boolean {
        return true;
    }

    start() {
        super.start();

        this._orgPos = this.node.getWorldPosition();
        this._appleOutputPos = this.appleOutput.getWorldPosition();

        this._sellCount = this.sellCount;
    }

    update(deltaTime: number) {
        this._moveInput.set(Vec3.ZERO);

        switch (this._state) {
            case AssistantController.State.WAIT:
                if (this._sellCount > 0 && (!this.payZone || !this.payZone.active)) {
                    this._state = AssistantController.State.TO_FACTORY_APPLE;
                }
                break;
            case AssistantController.State.TO_FACTORY_APPLE:
                this.calcMoveInput(this._appleOutputPos);
                break;
            case AssistantController.State.GET_PRODUCT_APPLE:
                if (this.canGo2Shop())
                    this._state = AssistantController.State.TO_SHOP;
                break;
            case AssistantController.State.TO_SHOP:
                if (this.isPackEmpty(false)){
                    this._sellCount --;
                    this._state = this._sellCount <= 0 ? 
                        AssistantController.State.RETURN : AssistantController.State.TO_FACTORY_APPLE;
                }else
                    this.calcMoveInput(this.findShopPosition());
                break;
            case AssistantController.State.RETURN:
                this._targetShopPos.set(this._orgPos);
                this._targetShopPos.subtract(this.node.position);
                if (this._targetShopPos.lengthSqr() < 0.5) {
                    this.node.setPosition(this._orgPos);
                    this._state = AssistantController.State.WAIT;
                }else
                    this.calcMoveInput(this._orgPos);
                break;
        }

        super.update(deltaTime);
    }

    protected calcMoveInput(endPos:Vec3){
        if (endPos){
            this._moveInput.set(endPos);
            this._moveInput.subtract(this.node.position);
            this._moveInput.normalize();
        }else{
            this._moveInput.set(Vec3.ZERO);
        }

        return this._moveInput;
    }

    protected fetchMovementInput() : Vec3{
        return this._moveInput;
    }

    protected canGo2Shop() {
        return this.hasProduct() && this.isPackFull(false);
    }

    protected findShopPosition() {
        if (this.shops) {
            for (let index = this.shops.children.length - 1; index >= 0; index--) {
                const element = this.shops.children[index];
                const shop:ShopTable = element.getComponent(ShopTable);
                if (shop && shop.canSell()) {
                    const orderType = shop.getOrderType();
                    if (orderType > 0) {
                        if (this.hasProduct(orderType)) {
                            shop.placePos.getWorldPosition(this._targetShopPos);

                            return this._targetShopPos;
                        }
                    }
                }
            }
        }

        return null;
    }

    public onFactoryOutput(enter:boolean): void {
        if (enter) {
            this._state = AssistantController.State.GET_PRODUCT_APPLE;
        } else {
            this._state = this.canGo2Shop() ? AssistantController.State.TO_SHOP : AssistantController.State.TO_FACTORY_APPLE;
        }
    }
}


