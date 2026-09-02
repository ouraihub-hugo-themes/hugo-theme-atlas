---
title: landing section 的非法输入
layout: landing
sections:
  - type: nope
  - type: Hero
  - type: hero
    headline: 未知键
    titel: 拼错的 title
  - type: cards
  - type: cards
    items: 不是数组
  - type: cards
    items:
      - body: 没有 title
  - type: metrics
    items:
      - value: "1"
      - label: 没有 value
  - type: hero
    id: 1bad
    headline: id 不合法
  - type: hero
    tone: neon
    headline: tone 不在三档里
  - type: cta
    actions:
      - text: 没有 href
      - href: /ok/
      - text: 坏 scheme
        href: javascript:alert(1)
      - text: 未知键
        href: /ok/
        target: _blank
      - text: 坏 style
        href: /ok/
        style: huge
  - type: cta
  - type: steps
    items:
      - body: 没有 title
      - 不是 map
  - type: faq
    items:
      - answer: 没有 question
      - question: 没有 answer
  - type: timeline
    items:
      - title: 没有 date
      - date: 2026-01-01
      - date: 2026-01-01
        title: 坏 status
        status: someday
  - type: principles
    items:
      - body: 没有 title
      - title: 没有 body
  - type: pricing
    items:
      - price: 没有 name
      - name: 没有 price
      - name: features 不是数组
        price: "1"
        features: 一条
  - type: pricing-compare
    items:
      - feature: 没有 plans
        values: [true]
  - type: pricing-compare
    plans: [A, B]
    items:
      - values: [true, true]
      - feature: values 不是数组
        values: 一个
      - feature: values 少一格
        values: [true]
expect:
  - 'unknown landing section type "nope"'
  - 'landing section type must match ^[a-z][a-z0-9-]*$; got "Hero"'
  - 'unknown key "titel"'
  - 'cards requires a non-empty items array'
  - 'cards items must be an array'
  - 'card requires title'
  - 'metric requires label'
  - 'metric requires value'
  - 'landing section id must start with a letter'
  - 'invalid landing section tone "neon"'
  - 'action requires href'
  - 'action requires text'
  - 'unsupported href scheme "javascript"'
  - 'unknown key "target"'
  - 'invalid action style "huge"'
  - 'cta has nothing to render'
  - 'step requires title'
  - 'each steps item must be a map'
  - 'faq entry requires question'
  - 'faq entry requires answer'
  - 'timeline entry requires date'
  - 'timeline entry requires title'
  - 'invalid timeline status "someday"'
  - 'principle requires title'
  - 'principle requires body'
  - 'plan requires name'
  - 'plan requires price'
  - 'plan features must be an array'
  - 'pricing-compare requires a non-empty plans array'
  - 'row requires feature'
  - 'row values must be an array'
  - 'row has 1 values but there are 2 plans'
---

`type` 未知、拼错的键、空的 items、少必需字段、坏 URL —— 每一条都只丢它自己那
一项或那一节，构建照常。
