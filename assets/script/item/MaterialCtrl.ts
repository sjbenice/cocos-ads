import { _decorator, Component, Material, MeshRenderer, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MaterialCtrl')
export class MaterialCtrl extends Component {
    private _meshRenderer:MeshRenderer;

    private _count:number = -1;

    start() {
        if (!this._meshRenderer)
            this._meshRenderer = this.node.getComponent(MeshRenderer);

        if (this._count >= 0)
            this.setValue(this._count);
    }

    public setValue(value:number){
        if (this._meshRenderer){
            if (value < this._meshRenderer.materials.length)
                this._meshRenderer.material = this._meshRenderer.materials[value];//this.digitMaterials[value];
            this._count = -1;
        }else
            this._count = value;
    }
}


