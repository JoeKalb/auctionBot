const tmi = require('tmi.js')
const express = require('express')
const fetch = require('node-fetch')
const dotenv = require('dotenv').config();

// Define configuration options
const opts = {
  identity: {
    username: process.env.USERNAME,
    password: process.env.PASSWORD
  },
  channels: [
    'thabuttress'
  ]
};

// Create a client with our options
const client = new tmi.client(opts)

// Register our event handlers (defined below)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)

// Connect to Twitch:
client.connect();

let topBid = {
    bid:0,
    username:''
}

let checkBidUsers = {}

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
            case '!bid':{
                try{
                    const bidAmount = parseInt(parse[1])
                    if(bidAmount > topBid.bid){
                        checkBidUsers[context.username] = bidAmount
                        client.whisper('thabottress', `!check ${context.username}`)
                    }
                }
                catch(err){
                    console.log(err)
                }
                break;
            }
            case '!topBid':{
                client.say(target, `${topBid.username} - ${topBid.bid}`)
                break;
            }
            case '!setTopBid':{
                if(target.mod){
                    const username = parse[1]
                    const bidAmount = parseInt(parse[2])

                    topBid.username = username
                    topBid.bid = bidAmount
                }
                break;
            }
            default:
        }
        break;
      }
        
    case 'whisper':{
        if(context.username === 'thabottress'){
            console.log(msg)
            const parse = msg.split(' ')
            if(parse.length === 2){
                const username = parse[0]
                const points = parseInt(parse[1])
                if(checkBid(username, points)){
                    // remove and buttcoins
                    buttcoins('remove', username, checkBidUsers[username])
                    
                    // reset and notify an updated bid
                    topBid.username = username
                    topBid.bid = checkBidUsers[username]
                    client.say('#thabuttress', `New Top Bidder: ${topBid.username} - ${topBid.bid}`)
    
                    // remove user from checkBidUsers
                    delete checkBidUsers[username]
                }
            }
        }
        break;
    }
    default:
        console.log(context['message-type'])
  }
}

function checkBid(username, points){
    if(points >= checkBidUsers[username]){
        return true
    }
    else{
        client.say('#thabuttress', `Sorry ${username}, you only have ${points} Buttcoins.`)
        delete checkBidUsers[username]
        return false
    }
}

function buttcoins(type, name, amount){
    console.log(`!buttcoins ${type} ${name} ${amount}`)
    client.whisper('thabottress', `!buttcoins ${type} ${name} ${amount}`)
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}