---
description: 長い作業の判断を TSV に1行ずつ残す
---
docs/worklog/<thorタスク番号>.tsv に追記する。無ければ次のヘッダ行で作る:
ts	phase	decision	why	evidence	result

- 1行に1判断。セルの中で改行しない。
- evidence にはコミットSHA、ファイル:行、ログのパスなどの参照だけを書く（説明文は書かない）。
- result の例: tests green / reverted / open / INCONCLUSIVE
- 記録するのは分岐点だけ（方針を選んだ、単位作業が終わった、やり直した、詰まった）。
- 作業を再開したときは、最後の数行を読んでから書き始める。
