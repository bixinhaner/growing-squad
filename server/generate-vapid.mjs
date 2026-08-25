import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()
process.stdout.write(`${JSON.stringify(keys, null, 2)}\n`)
