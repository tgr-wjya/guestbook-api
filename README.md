# guestbook-api

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/88392e6477d94754a0dd1588ff7bb386)](https://app.codacy.com/gh/tgr-wjya/guestbook-api?utm_source=github.com&utm_medium=referral&utm_content=tgr-wjya/guestbook-api&utm_campaign=Badge_Grade)
[![CircleCI](https://dl.circleci.com/status-badge/img/circleci/85F8zZ7ostSSLjq88Rwb8X/En4dD7SnUrHZBTKZYeSqfq/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/circleci/85F8zZ7ostSSLjq88Rwb8X/En4dD7SnUrHZBTKZYeSqfq/tree/main)
[![codecov](https://codecov.io/gh/tgr-wjya/guestbook-api/graph/badge.svg?token=aSFZgD4ysP)](https://codecov.io/gh/tgr-wjya/guestbook-api)
[![CodeTime Badge](https://shields.jannchie.com/endpoint?style=social&color=222&url=https%3A%2F%2Fapi.codetime.dev%2Fv3%2Fusers%2Fshield%3Fuid%3D36362%26project%3Dguestbook-api)](https://codetime.dev)

## what is it?

> its an in-memory guestbook api that i've built with elysia + bun, deployed on [railway](https://railway.com)

basically, you can leave a message for me here because there's really no one reading it besides me.
and since its my actual project, it'd be happy if people use it ᵔᴥᵔ

i know that i said that the only one reading is me but technically you could, i just thought that no one'd be bothered enough to check it out.

the downside of this project is that since the `messages` lives in the memory, it'll get wipeout every deployment, which is like every `push`.

but this is a temporary setback as i'll likely improve this project later for more persistent storage. this is a bored project after all.

## live url

you can check it out here: [guestbook-api](https://guestbook-api-production.up.railway.app/)

i'll provide the documentation for the api below.

## endpoints

| method | what it does |
| --------|------------|
| `GET /` | server info, me, greetings + uptime |
| `GET /messages` | **list all messages**, you can read all the message through here |
| `POST /messages` | **leave a message**, here's how you can leave a message |
| `DELETE /messages/:id` | **delete a message by id**, don't worry if you forgot the id. just list all the messages and find your previous message with its id |

>just a heads up, i leave a `.http` file in the root of this repo so you could get a pretty good grasp of the raw request used. just change the `@baseURL` to my actual `railway` url.

you won't be able to use it if you don't have [rest client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) on your ide. it is just to show you what the raw request looks like.

## stack

just **elysia** and **bun** my favorite dx tools.

## how to run it locally if you're really curious

- just `bun install` and `bun run index.ts`.
- not intended to be cloned but i'll leave it here if anyone's confused.
- that script assumes you already have [bun](https://bun.com/) installed, if you haven't do it.
- you can even deploy it if you want, which mean i need to add a copyright here.

### copyright

Copyright (c) 2026 Tegar Wijaya Kusuma

## find me here

[portfolio](https://tgr-wjya.github.io) · [linkedin](https://linkedin.com/in/tegar-wijaya-kusuma-591a881b9) · [email](mailto:tgr.wjya.queue.top126@pm.me)

---

8 march 2026

made with ◉‿◉
