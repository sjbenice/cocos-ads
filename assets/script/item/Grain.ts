import { _decorator, Collider, Component, Node, randomRange, RigidBody, tween, Tween, v3, Vec3 } from 'cc';
import { Item } from './Item';
const { ccclass, property } = _decorator;

@ccclass('Grain')
export class Grain extends Item {
    @property(RigidBody)
    rigidbody: RigidBody = null;
    @property(Collider)
    collider: Collider = null;

    protected _orgParent : Node = null;

    protected onLoad(): void {
        this._orgParent = this.node.parent;
    }

    start() {
        if (this.rigidbody == null)
            this.rigidbody = this.getComponent(RigidBody);
        if (this.rigidbody == null)
            this.rigidbody = this.getComponentInChildren(RigidBody);

        if (this.collider == null)
            this.collider = this.getComponent(Collider);
        if (this.collider == null)
            this.collider = this.getComponentInChildren(Collider);
    }

    public applyForce(force:Vec3) {
        if (this.rigidbody) {
            this.rigidbody.applyImpulse(force);
        }
    }

    public enablePhysics(enable:boolean){
        if (this.rigidbody) this.rigidbody.enabled = enable;
        if (this.collider) this.collider.enabled = enable;
    }

    public ajudstItem() : boolean {
        const ret:boolean = super.rotateIfColumn();
        this.enablePhysics(false);
        return ret;
    }

    public drop2Ground() {
        if (this._orgParent) {
            const worldPos = this.node.getWorldPosition();
            this.node.setParent(this._orgParent);
            this.node.setWorldPosition(worldPos);
        }
        this.enablePhysics(true);
    }
}


