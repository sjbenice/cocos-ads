import { _decorator, Component, Node, Tween, tween, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Chicken')
export class Chicken extends Component {
    @property
    zoom:number = 1.1;
    @property
    period:number = 0.3;
    @property
    periodVar:number = 0.1;
    
    private _effectZoom: Vec3 = null;
    private _finalZoom: Vec3 = new Vec3();

    start() {
        this._finalZoom.set(this.node.getScale());
        this._effectZoom = v3(this._finalZoom);
        this._effectZoom.multiplyScalar(1.1);

        tween(this.node)
            .to(this.period + Math.random() * this.periodVar, { scale: this._effectZoom }, { easing: 'sineInOut' })
            .to(this.period + Math.random() * this.periodVar, { scale: this._finalZoom }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    update(deltaTime: number) {
        
    }
    
    protected onDestroy(): void {
        Tween.stopAllByTarget(this.node);
    }
}


