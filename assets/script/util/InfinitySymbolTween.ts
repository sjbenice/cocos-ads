import { _decorator, Component, Node, Vec3, tween, Tween, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('InfinitySymbolTween')
export class InfinitySymbolTween extends Component {
    @property(Node)
    public targetNode: Node | null = null;

    @property
    scaleFactor: number = 0; // Scale factor for the infinity symbol
    @property
    duration:number = 2;// Duration for one complete loop in seconds
    @property
    step:number = 0.1; // Smaller step for smoother animation

    @property
    repeatCount:number = -1;// infinite

    start() {
        if (!this.targetNode)
            this.targetNode = this.node;

        if (this.scaleFactor == 0){
            const uiTransform:UITransform = this.getComponent(UITransform);
            if (uiTransform){
                this.scaleFactor = this.calculateScaleFactor(uiTransform.width);
            }
        }
        
        if (this.targetNode)
            this.targetNode.active = false;
        this.startTween();
    }

    protected onDestroy(): void {
        this.stopTween();
    }

    calculateScaleFactor(totalWidth:number){
        return totalWidth / (2 * 1.41);
    }

    animateInfinitySymbol(scaleFactor: number, duration: number, repeatCount:number) {
        if (!this.targetNode || scaleFactor <= 0 || duration <= 0)
            return;

        const points: Vec3[] = [];

        for (let t = 0; t < Math.PI * 2; t += this.step) {
            const x = scaleFactor * Math.cos(t) / (1 + Math.sin(t) * Math.sin(t));
            const y = scaleFactor * Math.sin(t) * Math.cos(t) / (1 + Math.sin(t) * Math.sin(t));
            points.push(new Vec3(x, y, 0));
        }

        const pathDuration = duration / points.length;

        let currentIndex = 0;
        const moveToNextPoint = () => {
            if (currentIndex < points.length) {
                tween(this.targetNode)
                    .to(pathDuration, { position: points[currentIndex] })
                    .call(() => {
                        if (this.targetNode.active) {
                            currentIndex++;
                            moveToNextPoint();
                        }
                    })
                    .start();
            } else {
                // Repeat the animation
                if (repeatCount < 0 || repeatCount > 0) {
                    if (repeatCount > 0)
                        repeatCount --;
                    currentIndex = 0;
                    moveToNextPoint();
                }else
                    this.targetNode.active = false;
            }
        };

        moveToNextPoint();
    }

    startTween() {
        if (this.targetNode && !this.targetNode.active) {
            this.targetNode.active = true;
            this.animateInfinitySymbol(this.scaleFactor, this.duration, this.repeatCount);
        }
    }

    stopTween() {
        if (this.targetNode && this.targetNode.active){
            this.targetNode.active = false;
            Tween.stopAllByTarget(this.targetNode);
        }
    }

    public isRunning() {
        return this.targetNode && this.targetNode.active;
    }
}
