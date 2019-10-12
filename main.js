const tmi = require('tmi.js')
const fetch = require('node-fetch')
const dotenv = require('dotenv').config();

const express = require('express')
const app = express()

// Define configuration options
const opts = {
  identity: {
    username: process.env.USERNAME,
    password: process.env.PASSWORD
  },
  channels: ['thabuttress'],
  connection:{
      port: 80
  }
};

const channelName = 'thabuttress'

// Create a client with our options
const client = new tmi.client(opts)

// Register our event handlers (defined below)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)

// Connect to Twitch:
let clientInfo;
client.connect().then(data => {
    console.log(data)
    clientInfo = data
}).catch(err => {
    console.log(err)
})

let topBid = {
    bid:0,
    username:''
}

let checkBidUsers = {}
let item = ''
let allowBid = false

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  switch(context['message-type']){
      case 'chat':{
        const parse = msg.split(' ')

        switch(parse[0]){
            case '!awake':{
                client.say(target, 'Beep Boop Botfish')
                break;
            }
            case '!auctionInfo':{
                client.say(target, `Birthday Month Buttcoin Auction!!! Commands: !bid <amount> | !topBid`)
                break;
            }
            case '!bid':{
                try{
                    const bidAmount = parseInt(parse[1])
                    if(bidAmount > topBid.bid && allowBid){
                        checkBidUsers[context.username] = bidAmount
                        client.whisper('thabottress', `!check ${context.username}`)
                    }
                    else if(!allowBid){
                        client.say(target, `Sorry ${context['display-name']}, there currently isn't an item up for auction.`)
                    }
                }
                catch(err){
                    console.log(err)
                }
                break;
            }
            case '!topBid':{
                client.say(target, `${(topBid.bid) ? `${(item !== '')? `Top Bid For ${item}: `:``}${topBid.username} - ${topBid.bid}`:`No one has bid yet!`}`)
                break;
            }
            case '!setItem':{
                if(checkUser(context.mod, context.username)){
                    try{
                        if(parse[1]){
                            item = parse[1]
                            allowBid = true
                            client.say(target, `Item up for auction! ${item}`)
                        }
                    }
                    catch(err){
                        console.log(err)
                    }
                }
                break;
            }
            case '!startAuction':{
                if(checkUser(context.mod, context.username)){
                    try{
                        if(parse[1]){
                            item = parse.slice(1).join(' ')
                            allowBid = true
                            client.say(target, `Item up for auction! ${item}`)
                        }
                    }
                    catch(err){
                        console.log(err)
                    }
                }
                break;
            }
            case '!setTopBid':{
                if(checkUser(context.mod, context.username)){
                    try{
                        const username = parse[1]
                        const bidAmount = parseInt(parse[2])
    
                        topBid.username = username
                        topBid.bid = bidAmount
                        allowBid = true
                        updateStreamDisplay(`Current Bid: ${topBid.bid}`, 60, 'white')
                    }
                    catch(err){
                        console.log(err)
                    }
                }
                break;
            }
            case '!sold':{
                if(topBid.bid && checkUser(context.mod, context.username)){
                    client.say(target,
                        `The winner ${(item !== '') ? `of ${item} `:``}is ${topBid.username} with a bid of ${topBid.bid} buttcoins!`)
                    topBid.username = ''
                    topBid.bid = 0
                    item = ''
                    allowBid = false
                }
                break;
            }
            default:
        }
        break;
    }
        
    case 'whisper':{
        if(context.username === 'thabottress'){
            console.log(`Bottress Whisper: ${msg}`)
            const parse = msg.split(' ')
            if(parse.length === 2){
                try{
                    const username = parse[0]
                    if(username === 'thabuttress'){
                        bottressResponding = true;
                        clearInterval(isStillRunning)
                        console.log('Bottress is up and running')
                    }
                    const points = parseInt(parse[1])
                    if(checkBid(username, points)){
                        // remove and add buttcoins

                        const removeAmount = checkBidUsers[username]
    
                        setTimeout(() => {
                            buttcoins('remove', username, removeAmount)
                        }, 5000)
                        if(topBid.bid){
                            const oldTopName = topBid.username
                            const oldTopBid = topBid.bid
                            setTimeout(() => {
                                buttcoins('add', oldTopName, oldTopBid)
                            }, 7000)
                        }
                        
                        // reset and notify an updated bid
                        topBid.username = username
                        topBid.bid = checkBidUsers[username]
                        client.say('#thabuttress', `New Top Bidder: ${topBid.username} - ${topBid.bid}`)
                        updateStreamDisplay(`${item} - ${topBid.bid}`, 60, 'white')
                    }

                    // remove user from checkBidUsers
                    delete checkBidUsers[username]
                }
                catch(err){
                    console.log(err)
                }
            }
        }
        break;
    }
    default:
        //console.log(context['message-type']) "action" is the final type
  }
}

function checkBid(username, points){
    let hasPoints = points >= checkBidUsers[username]
    if(!hasPoints && checkBidUsers.hasOwnProperty(username)){
        client.say('#thabuttress', `Sorry ${username}, you only have ${points} Buttcoins.`)
    }
    
    return hasPoints
}

function checkUser(mod, name){
    return mod || name === 'thabuttress'
}

function buttcoins(type, name, amount){
    console.log(`!buttcoins ${type} ${name} ${amount}`)
    client.whisper('thabottress', `!buttcoins ${type} ${name} ${amount}`) // make into whisper when this is working
}

let updateStreamDisplay = async (value, font, color) => {
    const body = JSON.stringify({
        value,
        font,
        color
    })
    let res = await fetch(`https://buttress-live-display.herokuapp.com?password=${channelName}`, {
        method:"POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body
    })
    let json = await res.json()
    console.log(json)
}


app.get('/', (req, res) => {
    res.send(`BotFish is using ${clientInfo[0]} on port ${clientInfo[1]}`)
})

let bottressResponding = false;
let isStillRunning;
app.get('/join/:channel', (req, res) => {
    client.join(req.params.channel)
    .then((data) => {

        if(data[0] === '#thabuttress'){
            isStillRunning = setInterval(() => {
                console.log(`Checking if Bottress is working`)
                if(bottressResponding)
                    clearInterval(isStillRunning)
                else{
                    client.whisper('thabottress', '!check thabuttress')
                }
            }, 10000)
            setTimeout(() => {
                clearInterval(isStillRunning)
            }, 50000)
        }

        res.send(`BotFish is here!`)
    }).catch((err) => {
        res.send(`Unable to join Channel: ${req.params.channel}`)
    });
})

app.get('/leave/:channel', (req, res) => {
    client.part(req.params.channel)
    .then((data) => {
        if(data[0] === '#thabuttress')
            clearInterval(isStillRunning)
        
        console.log(`BotFish has left channel: ${data[0]}`)
        res.send(`BotFish swam away!`)
    }).catch((err) => {
        res.send(`Unable to leave Channel: ${req.params.channel}`)
    });
})

app.listen(process.env.PORT, () => {
    console.log(`Botfish is listening on port ${process.env.PORT}`)
})

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}