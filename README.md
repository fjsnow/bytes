# bytes

A command-line incremental game, playable over SSH (or locally). Progress is persisted using your public key over multiple connections.

## Playing remotely

You can play remotely over SSH - Todo so, open your favourite terminal and write `ssh b.fjsn.io`.
If you've never used SSH before, you might need to setup a key first. Any guide [like this one](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) should work.

## Playing locally

To play locally
- Download [Bun](https://bun.sh)
- Install the dependencies with `bun install`
- Run `bun run start` to play.

## Hosting a remote server

To host a server
- Download [Bun](https://bun.sh)
- Install the dependencies with `bun install`
- Generate a priv/pub key **for the host** with `ssh-keygen -t rsa -b 4096 -f host_key -N ""`
- Run `bun run start --server <port>` to host.

You can then connect and play `ssh -p <port> localhost`, you may omit the `-p <port>` if you host it on port `22`.
