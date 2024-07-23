import { _decorator, CCInteger, Component, instantiate, Node, Prefab, tween, v3, Vec3 } from 'cc';
import { Boundary } from '../util/Boundary';
import { Grain } from '../item/Grain';
import { Item } from '../item/Item';
import { SoundMgr } from '../manager/SoundMgr';
import { ParabolaTween } from '../util/ParabolaTween';
const { ccclass, property } = _decorator;

@ccclass('BackPack')
export class BackPack extends Component {
    @property(Node)
    frontPos:Node;

    @property
    frontItemMax:number = 18;

    @property(Node)
    backPos:Node;

    @property
    backItemMax:number = 22;

    public getItemCount(isBack:boolean):number {
        const pos = isBack ? this.backPos : this.frontPos;
        return pos ? pos.children.length : 0;
    }

    public isFull(isBack:boolean):boolean {
        return (isBack && (!this.backPos || this.backPos.children.length >= this.backItemMax)) ||
            (!isBack && (!this.frontPos || this.frontPos.children.length >= this.frontItemMax));
    }

    public isEmpty(isBack:boolean):boolean {
        return (isBack && this.backPos && this.backPos.children.length == 0) ||
            (!isBack && this.frontPos && this.frontPos.children.length == 0);
    }

    public hasProduct(type:number=0):boolean {
        if (this.frontPos && this.frontPos.children.length > 0) {
            const item = this.frontPos.children[this.frontPos.children.length - 1].getComponent(Item);
            return item && item.isSellable() && (type == 0 || type == item.type);
        }
        return false;
    }

    public getGrainCount():number {
        return this.getItemCount(false);
    }

    public addItem(item:Item) : boolean {
        if (item) {
            if (!item.isPackBack() && this.frontPos.children.length > 0){
                const prevItem:Item = this.frontPos.children[0].getComponent(Item);
                if (prevItem){
                    if (prevItem.isSellable() && !item.isSellable())
                        return false;
                    else if (!prevItem.isSellable() && item.isSellable()) {
                        for (let index = this.frontPos.children.length - 1; index >= 0; index--) {
                            const element = this.frontPos.children[index];
                            const grain = element.getComponent(Grain);
                            if (grain){
                                grain.drop2Ground();
                            }                    
                        }
                    }
                }
            }

            if (this.isFull(item.isPackBack()))
                return false;
        }else
            return false;

        const packPos:Node = item.isPackBack() ? this.backPos : this.frontPos;
        if (!packPos)
            return false;

        if (item instanceof Grain){
            (item as Grain).ajudstItem();
        }

        const worldPos:Vec3 = item.node.getWorldPosition();
        item.node.setParent(packPos);

        const dimension = item.getHalfDimension();
        let yPos: number = 0;
        if (item.isPackBack()){
            item.node.setRotationFromEuler(0, 0, 0);
            yPos = dimension.y * 2 * packPos.children.length - dimension.y;

            // item.node.setPosition(v3(0, yPos, 0));
            item.node.setWorldPosition(worldPos);
            ParabolaTween.moveNodeParabola(item.node, v3(0, yPos, 0), 2, 
                0.15, -1, 360, false);
        } else {
            if (packPos.children.length > 1) {
                const lastItem:Item = packPos.children[packPos.children.length - 2].getComponent(Item);
                yPos = dimension.y + lastItem.node.position.y;
            }

            item.node.setPosition(v3(0, yPos + dimension.y, 0));
            item.scaleEffect(0.3);
        }

        this.playSfx(item.isPackBack());

        return true;
    }

    public dropOne(type:number, isGrain:boolean, worldPos:Vec3 = null) : Item {
        const packPos:Node = type == 0 ? this.backPos : this.frontPos;
        if (packPos) {
            for (let index = packPos.children.length - 1; index >= 0; index--) {
                const element = packPos.children[index];
                const item:Item = element.getComponent(Item);
                if (item.type == type && (isGrain == item instanceof Grain)){
                    if (worldPos){
                        const pos = element.getWorldPosition();
                        worldPos.set(pos.x, pos.y, pos.z);
                    }
                    packPos.removeChild(element);
    
                    const yDelta : number = item.getHalfDimension().y * 2;
                    for (let j = index; j < packPos.children.length; j++) {
                        const element = packPos.children[j];
                        element.setPosition(v3(0, element.position.y - yDelta, 0));
                    }
    
                    this.playSfx(type == 0);
    
                    return item;
                }
            }
        }

        return null;
    }

    private playSfx(isDollar:boolean) {
        SoundMgr.playSound(isDollar ? "coin_drop" : "catch");
    }

    public totalDollar() {
        if (this.backPos)
            return this.backPos.children.length;
        return 0;
    }
}


