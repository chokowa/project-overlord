# アイテム画像の追加方法

このガイドでは、ゲーム内のPARTS（パーツ）やGEAR（ギア）に独自の画像を追加する方法を説明します。

## 準備

### 1. 画像ファイルの仕様
- **形式**: PNG推奨（透過背景対応）
- **サイズ**: 64x64～128x128ピクセル
- **背景**: 透過推奨（ゲーム内で色が適用されます）

### 2. 対応アイテム一覧

#### PARTS（パーツ）
- `ruby_ring.png` - ルビーリング
- `emerald_ring.png` - エメラルドリング
- `midas_ring.png` - ミダスの指輪

#### GEAR（ギア）
- `sapphire_amulet.png` - サファイアの護符
- `gold_amulet.png` - 黄金の護符
- `vampire_fang.png` - 吸血の牙

## 画像追加手順

### ステップ1: 画像配置
準備した画像を以下のフォルダに配置します：

```
GAME/
└── assets/
    └── artifacts/
        ├── ruby_ring.png
        ├── emerald_ring.png
        └── ... (その他のアイテム)
```

### ステップ2: ブラウザ更新
ゲームをリロード（F5キー）すると、自動的に新しい画像が表示されます。

## 注意事項

- **ファイル名は厳密に**: `{item_id}.png`の形式を守ってください
  - 例: `ruby_ring.png`（`RubyRing.png`や`ruby-ring.png`は不可）
- **画像がない場合**: 自動的に絵文字アイコンにフォールバックします
- **パス変更不要**: `constants.js`は既に設定済みです

## トラブルシューティング

### 画像が表示されない
1. ファイル名が正しいか確認
2. ファイルパスが`assets/artifacts/`内か確認
3. ブラウザのキャッシュをクリア（Ctrl+Shift+R）

### 画像が歪む
- 正方形の画像を使用してください（64x64, 128x128など）

## 技術詳細（開発者向け）

### constants.jsの設定
各アイテムには`iconImage`プロパティが含まれています：

```javascript
RUBY_RING: {
    id: 'ruby_ring',
    iconImage: 'assets/artifacts/ruby_ring.png',  // ← この部分
    // ...
}
```

### ui.jsの読み込みロジック
`item.iconImage`を優先的に読み込み、なければ`imgMap`にフォールバックします。

画像がどちらにもない場合は、絵文字アイコンが表示されます。
