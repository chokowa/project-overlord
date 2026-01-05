/**
 * @fileoverview Blocklyのカスタムブロック定義およびコード生成ロジック
 */

/** @type {any} */
const javascriptGenerator = (window).Blockly.JavaScript;

// --- ブロック定義 ---

// 1. 射程内の敵リスト取得
Blockly.Blocks['get_enemies'] = {
  init: function() {
    this.appendDummyInput().appendField("射程内の敵リストを取得");
    this.setOutput(true, "Array");
    this.setColour(160);
    this.setTooltip("現在タレットの射程内にいる敵をリストとして取得します。");
  }
};

javascriptGenerator['get_enemies'] = function(block) {
  // game.js内のupdateTargetで引数として渡される変数名
  const code = 'enemyList';
  return [code, javascriptGenerator.ORDER_ATOMIC];
};

// 2. 敵の抽出（最短距離・最大HPなど）
Blockly.Blocks['select_enemy'] = {
  init: function() {
    this.appendValueInput("LIST").setCheck("Array").appendField("リストから");
    this.appendDummyInput()
        .appendField("が")
        .appendField(new Blockly.FieldDropdown([
            ["最短距離", "MIN_DIST"],
            ["最大HP", "MAX_HP"],
            ["最小HP", "MIN_HP"]
        ]), "CRITERIA")
        .appendField("の敵を選択");
    this.setOutput(true, "Enemy");
    this.setColour(160);
    this.setTooltip("指定された条件に基づき、リストから1体の敵を選び出します。");
  }
};

javascriptGenerator['select_enemy'] = function(block) {
  const listCode = javascriptGenerator.valueToCode(block, 'LIST', javascriptGenerator.ORDER_ATOMIC) || '[]';
  const criteriaValue = block.getFieldValue('CRITERIA');
  // game.js内のヘルパー関数を呼び出すコードを生成
  const code = `selectEnemyHelper(${listCode}, "${criteriaValue}")`;
  return [code, javascriptGenerator.ORDER_FUNCTION_CALL];
};

// 3. ターゲット設定アクション
Blockly.Blocks['set_target'] = {
  init: function() {
    this.appendValueInput("ENEMY").setCheck("Enemy").appendField("ターゲットを");
    this.appendDummyInput().appendField("に設定する");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setTooltip("選んだ敵を、タレットが次に攻撃すべきターゲットとしてロックオンします。");
  }
};

javascriptGenerator['set_target'] = function(block) {
  const enemyCode = javascriptGenerator.valueToCode(block, 'ENEMY', javascriptGenerator.ORDER_ATOMIC) || 'null';
  // Turretインスタンスのメンバ変数を書き換えるコード
  return `this.targetEnemy = ${enemyCode};\n`;
};