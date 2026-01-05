/**
 * @fileoverview Blocklyのカスタムブロック定義およびコード生成ロジック
 * 最新のBlockly仕様（forBlock）に適合させたバージョン
 */

/** @type {any} */
const javascriptGenerator = (window).Blockly.JavaScript;

// 1. 射程内の敵リスト取得ブロック
Blockly.Blocks['get_enemies'] = {
  init: function() {
    this.appendDummyInput().appendField("射程内の敵リストを取得");
    this.setOutput(true, "Array");
    this.setColour(160);
    this.setTooltip("現在タレットの射程内にいる敵全員をリストとして返します。");
  }
};

javascriptGenerator.forBlock['get_enemies'] = function(block, generator) {
  const generatedCode = 'enemyList';
  return [generatedCode, generator.ORDER_ATOMIC];
};

// 2. 敵の抽出ブロック（最短距離・最大HPなど）
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
    this.setTooltip("条件に一致する敵を1体選び出します。");
  }
};

javascriptGenerator.forBlock['select_enemy'] = function(block, generator) {
  const listCode = generator.valueToCode(block, 'LIST', generator.ORDER_ATOMIC) || '[]';
  const criteriaValue = block.getFieldValue('CRITERIA');
  const generatedCode = `selectEnemyHelper(${listCode}, "${criteriaValue}")`;
  return [generatedCode, generator.ORDER_FUNCTION_CALL];
};

// 3. ターゲット設定ブロック
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

javascriptGenerator.forBlock['set_target'] = function(block, generator) {
  const enemyInstanceCode = generator.valueToCode(block, 'ENEMY', generator.ORDER_ATOMIC) || 'null';
  return `this.targetEnemy = ${enemyInstanceCode};\n`;
};