import { _decorator, Component, Enum, Node, Prefab, randomRange, randomRangeInt, Vec3 } from 'cc';
import { AvatarController } from './AvatarController';
import { ShopTable } from './ShopTable';
import { MaterialCtrl } from '../item/MaterialCtrl';
const { ccclass, property } = _decorator;

@ccclass('GuestController')
export class GuestController extends AvatarController {
    static State = {
        WAIT: 0,
        PREPARE: 1,
        WALK2SHOP: 2,
        ORDERING: 3,
        WALK2BACK: 4,
    };

    @property
    maxDelay:number = 3;

    @property
    baseSpeedVar:number = 0.5;

    @property
    maxOrderCount:number = 6;

    @property(Node)
    buyOrder:Node;

    @property(MaterialCtrl)
    orderTypeCtrl:MaterialCtrl;
    @property(MaterialCtrl)
    orderCountCtrl:MaterialCtrl;

    orderCount:number = 0;
    speed:number = 0;

    buyType:number = 0;

    private _traceIndex:number = 0;
    private _startPos:Vec3 = null;
    private _endPos:Vec3 = null;
    private _moveInput:Vec3 = null;
    private _moveDistance:number = null;

    private _shopTable:ShopTable = null;

    private _state:number = GuestController.State.WAIT;
    private _buyTypes:number[] = null;

    public setParams(buyTypes:number[], table:ShopTable){
        this._buyTypes = buyTypes;
        this._shopTable = table;

        this.node.setWorldPosition(this.getWorldPositionOfTrace(0));
    }

    protected getTraceSegmentCount() {
        if (this._shopTable)
            return this._shopTable.arriveTrace.children.length;
        return 0;
    }

    protected getWorldPositionOfTrace(index:number): Vec3 {
        const trace = this._shopTable.arriveTrace;
        if (index >= 0 && index < this.getTraceSegmentCount())
            return trace.children[index].getWorldPosition();

        return Vec3.ZERO;
    }

    protected moveTraceSegment(isback:boolean) : boolean {
        let endPos;
        const startPos = this.getWorldPositionOfTrace(this._traceIndex);
        if (isback){
            if (this._traceIndex <= 0)
                return false;
            endPos = this.getWorldPositionOfTrace(--this._traceIndex);
        } else {
            if (this._traceIndex >= this.getTraceSegmentCount() - 1)
                return false;
            endPos = this.getWorldPositionOfTrace(++this._traceIndex);
        }
        this.moveFromTo(startPos, endPos);
        return true;
    }

    protected moveFromTo(startPos:Vec3, endPos:Vec3){
        this._startPos = startPos;
        this._endPos = endPos;
        if (startPos && endPos){
            this._moveInput = this._endPos.clone();
            this._moveInput.subtract(this._startPos);
            this._moveDistance = this._moveInput.length();
            this._moveInput = this._moveInput.normalize();
        }else{
            this._moveDistance = 0;
            this._moveInput = null;
        }
    }

    protected calcSpeed() {
        this.speed = super.getMaxSpeed() * (1 + Math.random() * this.baseSpeedVar);
    }

    protected getMaxSpeed(){
        return this.speed;
    }

    protected fetchMovementInput() : Vec3{
        return this._moveInput;
    }

    start () {
        super.start();

        if (this.buyOrder)
            this.buyOrder.active = false;

        this.prepareParams();

        this._state = GuestController.State.WALK2SHOP;
        this._traceIndex = this.getTraceSegmentCount() - 2;
        this.moveTraceSegment(false);
    }

    update(deltaTime: number) {
        super.update(deltaTime);

        if (this._moveInput != null){
            const curPos:Vec3 = this.node.position.clone();
            if (curPos.subtract(this._startPos).length() >= this._moveDistance){
                this.stopAvatar(true);
                this.node.setWorldPosition(this._endPos);
                this.moveFromTo(null, null);
            }    
        } else {
            switch (this._state) {
                case GuestController.State.WALK2SHOP:
                    if (!this.moveTraceSegment(false)) {
                        const moveInput:Vec3 = this._shopTable.placePos.getWorldPosition().clone();
                        moveInput.subtract(this.node.getWorldPosition());
                        if (this.faceView(moveInput.normalize(), deltaTime) < 0.01){
                            this._state = GuestController.State.ORDERING;
                            if (this.buyOrder)
                                this.buyOrder.active = true;
                            this._shopTable.arrivedGuest(this);
                        }
                    }
                    break;
                case GuestController.State.ORDERING:
                    if (this.orderCount == 0) {
                        this._shopTable.arrivedGuest(null);
                        if (this.buyOrder)
                            this.buyOrder.active = false;
                        this._state = GuestController.State.WALK2BACK;
                        this.moveTraceSegment(true);
                    }
                    break;
                case GuestController.State.WALK2BACK:
                    if (!this.moveTraceSegment(true))
                        this._state = GuestController.State.WAIT;
                    break;
                case GuestController.State.WAIT:
                    this._state = GuestController.State.PREPARE;
                    this.scheduleOnce(()=>{
                        this._state = GuestController.State.WALK2SHOP;

                        this.prepareParams();
    
                        this._traceIndex = 0;
                        this.moveTraceSegment(false);
    
                    }, randomRange(0, this.maxDelay));
                    break;
            }
        }
    }

    protected prepareParams() {
        if (this._shopTable && this._shopTable.sellType > 0)
            this.buyType = this._shopTable.sellType;
        else
            this.buyType = this._buyTypes[Math.floor(Math.random() * this._buyTypes.length)];
        
        if (this.orderTypeCtrl)
            this.orderTypeCtrl.setValue(this.buyType - 1);
        this.orderCount = randomRangeInt(1, this.maxOrderCount + 1);
        if (this.orderCountCtrl)
            this.orderCountCtrl.setValue(this.orderCount);
        this.calcSpeed();
    }

    public buyOne(){
        if (this.orderCount > 0){
            this.orderCount --;
            if (this.orderCountCtrl)
                this.orderCountCtrl.setValue(this.orderCount);
        }
    }
}


