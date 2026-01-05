/**
 * @fileoverview Blocklyの定義および実行ブリッジ (Patch-09)
 * 憲法準拠: 1文字変数禁止、型ヒント必須、定数管理。
 */

/** Blockly ツールボックスの定義 (XML) */
const TOOLBOX_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
    <category name="索敵ロジック" colour="160">
        <block type="get_enemies"></block>
        <block type="select_enemy"></block>
        <block type="set_target"></block>
    </category>
</xml>`;

/** * ワークスペースの初期化とインジェクション
 */
const workspace = Blockly.inject('blockly-div', {
    toolbox: TOOLBOX_XML,
    scrollbars: true,
    trashcan: true,
    zoom: { controls: true, wheel: true }
});

/** * Blocklyから生成されたコードをゲームエンジンに適用する
 */
window.applyAiLogic = function() {
    const javascriptGenerator = Blockly.JavaScript;
    // @ts-ignore
    const generatedCode = javascriptGenerator.workspaceToCode(workspace);
    
    try {
        // グローバルに定義されるであろう実行用関数にコードをセット
        if (window.updateCustomAi) {
            window.updateCustomAi(generatedCode);
            console.log("AI Logic Applied:", generatedCode);
        }
    } catch (errorInstance) {
        console.error("AI Logic Error:", errorInstance);
    }
};

// 初期配置用のダミーコード（最短距離の敵を狙うデフォルト）
window.addEventListener('load', () => {
    const defaultXml = `
    <xml xmlns="https://developers.google.com/blockly/xml">
        <block type="set_target" x="20" y="20">
            <value name="ENEMY">
                <block type="select_enemy">
                    <field name="CRITERIA">MIN_DIST</field>
                    <value name="LIST">
                        <block type="get_enemies"></block>
                    </value>
                </block>
            </value>
        </block>
    </xml>`;
    Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(defaultXml), workspace);
});