/// Edited: I know it doesn't matter, but here, return Object.assign(new Promise(), {}) should be used instead, I know it's just example but I have a strong OCD.
const download = function(root, sublinks) {
    return {
        mainURL: 'https://'+root',
        URLs: sublinks,
        recieved: {},
        *[Symbol.iterator] () {
            while(this.URLs.length>0){                
                yield this.download(this.URLs.pop())
            }
        },
        download: function(URL, dURL = null, setRecieved = (recieved)=>{return Object.assign(this.recieved[URL], recieved)}) {
            return new Promise((res, rej)=>{
                var timeout = setTimeout(()=>{
                    rej(Symbol.for('http2.client.timeout'))
                }, config.http2.client.timeout.beforeResponse )
                if(dURL==null) dURL = URL
                req = this.client.request({[HTTP2_HEADER_PATH]: dURL})
                req.setEncoding('UTF8')
                req.on('response', (headers, flags)=>{
                    console.log()
                    console.log('Download URL:')
                    console.log(dURL)
                    timeout.refresh()
                    this.recieved[URL] = {}
                    if(headers['server']==='Apache') 
                        {   req.on('data', ()=>{               
                        })
                            req.end()
                        }
                    var STATUS = headers[HTTP2_HEADER_STATUS] || headers[':status']          
                    if(STATUS>0) {
                        setRecieved( {
                            URL: URL,
                            status: STATUS,
                            content: '',
                            add: function(x){
                                this.content += x
                            },
                            type: null || headers['Content-Type'],
                            lang: null || headers['Content-Language'],
                            encoding: null || headers['Content-Encoding'],
                            lenght: null || headers['Content-Lenght']
                        })
                    } else {
                        setRecieved( {                            
                            URL: URL,
                            status: STATUS,
                        } )
                    }
                    if(STATUS===200) {                                    
                        req.on('data', (chunk)=>{
                            this.recieved[URL].add(chunk)
                            timeout.refresh()
                        })
                    }
                    if(STATUS===404) {
                        return rej({
                            sts:Symbol.for('http.client.request.rejected'),
                            for:Symbol.for('http.error.404'),
                            obj:this.recieved[URL]
                        })
                    }
                    if(STATUS===301) {
                        var currentLocation = headers['content-location'] || headers['location']

                        console.log('Redirect!')

                        if(!(this.recieved[URL].redirect instanceof Array)) this.recieved[URL].redirect = []
                        this.recieved[URL].redirect.push(currentLocation)
                        if(this.recieved[URL].lenght > config.http2.client.maxRedirect ) rej(Symbol.for('http2.client.maxRedirect'))
                        this.download(URL, currentLocation, (recieved)=>{
                            return Object.assign(this.recieved[URL], recieved)
                        }).then(
                            (resd)=>{
                                res(resd)
                            },
                            (rejd)=>{
                                rej(rejd)
                            }
                        )
                    }
                    console.log('End of req.on(request)')
                })
                req.on('end', ()=>{
                    console.log('ENDING')
                    res({
                        sts:Symbol.for('http.client.request.end'),
                        obj:this.recieved[URL]
                    })           
                })
            })
        },     
        then: function(callbackResolved, callbackRejected) {
            this.client = http2.connect(this.mainURL)
            this.loads  = []
            for(link of this) {
                this.loads.push(link.then(callbackResolved, callbackRejected))
            }
        }
    }
}

download('http2.akamai.com', [
    '/demo',
    '/non-existing-link'

]).then( (good)=>{
    console.log('Download: [finished]')
    console.log(good)
}, (bad)=>{
    console.log('Download: [failed]')
    console.log(bad)
})
