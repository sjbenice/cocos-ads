import { _decorator, Component, Node, Quat, RigidBody, Tween, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AutoCloseDoor')
export class AutoCloseDoor extends Component {
    @property(Node)
    doorNode: Node = null;
    @property
    closeTime: number = 0.5;

    private _initialRotation: Quat = new Quat();
    private _rigidBody: RigidBody = null;
    private _angularVelocity = new Vec3();
    private _opening:boolean = false;

    protected onLoad(): void {
        if (!this.doorNode)
            this.doorNode = this.node;

        if (this.doorNode) {
            this._initialRotation.set(this.doorNode.rotation);
            this._rigidBody = this.doorNode.getComponent(RigidBody);
        }
    }

    start() {

    }

    update(deltaTime: number) {
        if (this.doorNode && this._rigidBody){
            this._rigidBody.getAngularVelocity(this._angularVelocity);

            if (this._angularVelocity.length() > 0.01) {
                this._opening = true;
                Tween.stopAllByTarget(this.doorNode);
            } else if (this._opening){
                this._opening = false;
                tween(this.doorNode)
                .to(this.closeTime, {rotation:this._initialRotation}, {easing: 'linear'})
                .start();
            }
        }
    }
}


