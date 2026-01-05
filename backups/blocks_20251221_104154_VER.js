/**
 * @fileoverview Blocklyのカスタムブロック定義およびコード生成ロジック
 * * 修正内容:
 * 1. 同一変数名(javascriptGenerator)の二重宣言を解消
 * 2. 品質憲法に基づき、型ヒント(JSDoc)を追加
 * 3. 定数オブジェクト(CONSTANTS)による文言管理を導入
 * 4. 変数名の明文化（1文字変数の禁止と記述の具体化）
 */

/**
 * 内部で使用する定数定義
 * @type {Object}
 */
const BLOCK_CONSTANTS = {
    CRITERIA: {
        MIN_DIST: "MIN_DIST",
        MAX_HP: "MAX_HP",
        MIN_HP: "MIN_HP"
    },
    ERROR_MESSAGES: {
        UNDEFINED_LIST: "enemyList is not defined in the execution context."
    }
};

/** * BlocklyのJavaScriptジェネレータ取得
 * @type {any} 
 */
const javascriptGenerator = (window).javascript 
    ? (window).javascript.javascriptGenerator 
    : (window).Blockly.JavaScript;

// --- 1. 射程内の敵リスト取得ブロック ---

Blockly.Blocks['get_enemies'] = {
  /** @this {Blockly.Block} */
  init: function() {
    this.appendDummyInput().appendField("射程内の敵リストを取得");
    this.setOutput(true, "Array");
    this.setColour(160);
    this.setTooltip("現在タレットの射程内にいる敵全員をリストとして返します。");
  }
};

/**
 * @param {Blockly.Block} blockInstance
 * @param {any} generator
 * @return {[string, number]}
 */
javascriptGenerator.forBlock['get_enemies'] = function(blockInstance, generator) {
  // 実行環境に enemyList 変数が存在することを前提とする
  const generatedCode = 'enemyList';
  return [generatedCode, generator.ORDER_ATOMIC];
};

// --- 2. 敵の抽出ブロック（最短距離・最大HPなど） ---

Blockly.Blocks['select_enemy'] = {
  /** @this {Blockly.Block} */
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

/**
 * @param {Blockly.Block} blockInstance
 * @param {any} generator
 * @return {[string, number]}
 */
javascriptGenerator.forBlock['select_enemy'] = function(blockInstance, generator) {
  const listCode = generator.valueToCode(blockInstance, 'LIST', generator.ORDER_ATOMIC) || '[]';
  const criteriaValue = blockInstance.getFieldValue('CRITERIA');
  // selectEnemyHelperは実行環境のグローバルまたはスコープ内に定義されている必要がある
  const generatedCode = `selectEnemyHelper(${listCode}, "${criteriaValue}")`;
  return [generatedCode, generator.ORDER_FUNCTION_CALL];
};

// --- 3. ターゲット設定ブロック ---

Blockly.Blocks['set_target'] = {
  /** @this {Blockly.Block} */
  init: function() {
    this.appendValueInput("ENEMY").setCheck("Enemy").appendField("ターゲットを");
    this.appendDummyInput().appendField("に設定する");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setTooltip("選んだ敵を、タレットが狙う対象として確定させます。");
  }
};

/**
 * @param {Blockly.Block} blockInstance
 * @param {any} generator
 * @return {string}
 */
javascriptGenerator.forBlock['set_target'] = function(blockInstance, generator) {
  const enemyInstanceCode = generator.valueToCode(blockInstance, 'ENEMY', generator.ORDER_ATOMIC) || 'null';
  // 実行時のコンテキスト(this)がタレットインスタンスであることを期待する生成コード
  return `this.targetEnemy = ${enemyInstanceCode};\n`;
};