import { _decorator, Collider, Component, instantiate, ITriggerEvent, Node, Prefab, randomRange, v3 } from 'cc';
import { PayZone } from '../controller/PayZone';
import { Item } from './Item';
import { Grain } from './Grain';
import { Utils } from '../util/Utils';
const { ccclass, property } = _decorator;

@ccclass('Field')
export class Field extends Component {
    @property(Prefab)
    grainSample:Prefab | null = null;
    @property(Prefab)
    grainTreeSample:Prefab | null = null;

    @property(Node)
    cropPos:Node | null = null;

    @property
    multiple:number = 1;

    @property(PayZone)
    payZone:PayZone;

    @property
    growTime:number = 1;
    @property
    growTimeVar:number = 0.1;
    @property
    dropY:number = 1;
    @property
    force:number = 0.01;

    private _cropped:boolean = false;
    private _cropping:boolean = false;

    start() {
        if (!this.payZone)
            this.cropField();
    }

    update(deltaTime: number) {
        if (this.payZone && this.isEmpty()) {
            if (!this._cropped){
                if (this.payZone.isCompleted())
                    this.cropField();
            } else if (!this._cropping) {
                this._cropped = false;
                this.payZone.prepare();
            }
        }
    }

    public isEmpty() : boolean {
        return this.node.children.length == 0;
    }

    public popOne() : Grain {
        if (this.isEmpty()) return null;

        // const element = this.node.children[Math.floor(Math.random() * this.node.children.length)];
        const element = this.node.children[this.node.children.length - 1];
        this.node.removeChild(element);

        return element.getComponent(Grain);
    }
    
    protected cropTree() : boolean {
        if (!this.grainTreeSample)
            return false;

        this.cropPos.children.forEach(element => {
            const tree:Node = instantiate(this.grainTreeSample);
            if (tree) {
                this.node.addChild(tree);
                tree.setWorldPosition(element.getWorldPosition());
            }
        });

        return true;
    }

    protected cropGrain() : void {
        if (!this.grainSample)
            return;

        Utils.removeChildrenDestroy(this.node);
        
        this.cropPos.children.forEach(element => {
            for (let index = 0; index < this.multiple; index++) {
                const obj: Node = instantiate(this.grainSample);
                obj.setWorldPosition(element.getWorldPosition());
                obj.setRotationFromEuler(Math.random() * 360, Math.random() * 360, Math.random() * 360);
                this.node.addChild(obj);

                obj.setPosition(obj.position.x, obj.position.y + this.dropY, obj.position.z);
                if (this.force > 0) {
                    const randomForce = v3(randomRange(-this.force, this.force), randomRange(-this.force, this.force), randomRange(-this.force, this.force));
                    obj.getComponent(Grain).applyForce(randomForce);
                }
            }
        });

        this._cropping = false;
    }

    public cropField(): void {
        if (this.isEmpty() && this.cropPos && this.grainSample){
            this._cropping = true;

            if (this.cropTree()) {
                this.scheduleOnce(()=>{
                    this.cropGrain();
                }, this.growTime);
            } else
                this.cropGrain();

            this._cropped = true;
        }
    }
}


