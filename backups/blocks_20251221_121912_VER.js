/**
 * @fileoverview Blocklyのカスタムブロック定義、コード生成、およびワークスペース管理
 * 憲法準拠: 1文字変数禁止、型ヒント必須、定数管理徹底。
 */

/** * 内部で使用する定数定義
 * @type {Object}
 */
const BLOCK_CONSTANTS = {
    CRITERIA: {
        MIN_DIST: "MIN_DIST",
        MAX_HP: "MAX_HP",
        MIN_HP: "MIN_HP"
    }
};

// --- 1. カスタムブロックの定義 (見た目と接続ルール) ---

Blockly.Blocks['get_enemies'] = {
    init: function() {
        this.appendDummyInput().appendField("射程内の敵リストを取得");
        this.setOutput(true, "Array");
        this.setColour(160);
        this.setTooltip("現在タレットの射程内にいる敵全員をリストとして返します。");
    }
};

Blockly.Blocks['select_enemy'] = {
    init: function() {
        this.appendValueInput("LIST").setCheck("Array").appendField("リストから");
        this.appendDummyInput()
            .appendField("が")
            .appendField(new Blockly.FieldDropdown([
                ["最短距離", BLOCK_CONSTANTS.CRITERIA.MIN_DIST],
                ["最大HP", BLOCK_CONSTANTS.CRITERIA.MAX_HP],
                ["最小HP", BLOCK_CONSTANTS.CRITERIA.MIN_HP]
            ]), "CRITERIA")
            .appendField("の敵を選択");
        this.setOutput(true, "Enemy");
        this.setColour(160);
        this.setTooltip("条件に一致する敵を1体選び出します。");
    }
};

Blockly.Blocks['set_target'] = {
    init: function() {
        this.appendValueInput("ENEMY").setCheck("Enemy").appendField("ターゲットを");
        this.appendDummyInput().appendField("に設定する");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(20);
        this.setTooltip("選んだ敵を、タレットが狙う対象として確定させます。");
    }
};

// --- 2. JavaScriptコード生成ロジック ---

const javascriptGenerator = Blockly.JavaScript;

javascriptGenerator.forBlock['get_enemies'] = function(blockInstance, generator) {
    const generatedCode = 'enemyList';
    return [generatedCode, generator.ORDER_ATOMIC];
};

javascriptGenerator.forBlock['select_enemy'] = function(blockInstance, generator) {
    const listCode = generator.valueToCode(blockInstance, 'LIST', generator.ORDER_ATOMIC) || '[]';
    const criteriaValue = blockInstance.getFieldValue('CRITERIA');
    const generatedCode = `selectEnemyHelper(${listCode}, "${criteriaValue}")`;
    return [generatedCode, generator.ORDER_FUNCTION_CALL];
};

javascriptGenerator.forBlock['set_target'] = function(blockInstance, generator) {
    const enemyInstanceCode = generator.valueToCode(blockInstance, 'ENEMY', generator.ORDER_ATOMIC) || 'null';
    return `this.targetEnemy = ${enemyInstanceCode};\n`;
};

// --- 3. ワークスペースの初期化と管理 ---

const TOOLBOX_DEFINITION = `
<xml xmlns="https://developers.google.com/blockly/xml">
    <category name="索敵ロジック" colour="160">
        <block type="get_enemies"></block>
        <block type="select_enemy"></block>
        <block type="set_target"></block>
    </category>
</xml>`;

const mainWorkspace = Blockly.inject('blockly-div', {
    toolbox: TOOLBOX_DEFINITION,
    scrollbars: true,
    trashcan: true,
    zoom: { controls: true, wheel: true }
});

window.applyAiLogic = function() {
    // @ts-ignore
    const generatedCode = javascriptGenerator.workspaceToCode(mainWorkspace);
    
    try {
        if (window.updateCustomAi) {
            window.updateCustomAi(generatedCode);
            console.log("AI Applied successfully.");
        }
    } catch (errorInstance) {
        console.error("Critical AI implementation error:", errorInstance);
    }
};

// --- 4. 初期配置ロジック ---

window.addEventListener('load', () => {
    const initialXml = `
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
    
    try {
        // Fix for modern Blockly versions
        const xmlDom = Blockly.utils.xml.textToDom(initialXml);
        Blockly.Xml.domToWorkspace(xmlDom, mainWorkspace);
    } catch (xmlError) {
        console.warn("Failed to load initial XML:", xmlError);
    }
});