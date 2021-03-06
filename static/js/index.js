var nebulas = require("nebulas"),
    NebPay = require("nebpay"),
    HttpRequest = nebulas.HttpRequest,
    Neb = nebulas.Neb,
    // Account = nebulas.Account,
    // Transaction = nebulas.Transaction,
    Unit = nebulas.Unit,
    Utils = nebulas.Utils;

var chainnetConfig = {
    mainnet: {
        name: "主网",
        contractAddress: "n1jWpKadorv27XgSbo4WRZvsyCdAajkEP4B",
        txhash: "04222aa816c36a7895efd59256f4f2844fae253064ebc40c155266e3d6cc5220",
        host: "https://mainnet.nebulas.io",
        payhost: "https://pay.nebulas.io/api/mainnet/pay"
    },
    testnet: {
        name: "测试网",
        contractAddress: "n1iw6b9KtKsGaeKPi7GEyJDRLibpw4jf8f9",
        txhash: "6c9ebc2b9d1e5c6b035b05ba6448911d17599b2026c9d0bd504c372b5f8fe977",
        host: "https://testnet.nebulas.io",
        payhost: "https://pay.nebulas.io/api/pay"
    },
    localnet: {
        name: "本地网",
        contractAddress: "n1iw6b9KtKsGaeKPi7GEyJDRLibpw4jf8f9",
        txhash: "6c9ebc2b9d1e5c6b035b05ba6448911d17599b2026c9d0bd504c372b5f8fe977",
        host: "http://localhost:8685",
        payhost: "http://localhost:8685/api/pay"
    }
}


//var chain = localStorage.getItem("chain") || "localnet"
var chain = "localnet"
var chainInfo = chainnetConfig[chain]

var neb = new Neb();
neb.setRequest(new HttpRequest(chainInfo.host));

var nasApi = neb.api;
var nebPay = new NebPay();

var cls, app, nebState;

var state = {
    chain_id: 1,
}
nebState = state


Vue.prototype.$http = axios

function getErrMsg(err) {
    var msg = ""
    if (err == 'Error: 403') {
        msg = "权限禁止"
    } else if (err == 'Error: 10000') {
        msg = "打赏金额必须大于0"
    }
    return msg
}

function mylog() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("cat-->")
    console.log.apply(console, args);
}


var catMainnet = {
    contractAddress: "n1ijXKyQLvwSv72d1VpFgQTzNrgJhLRQhvL",
    txhash: "419b50d13e223385710d58082c44fee6c852aaa297a8edf69f9b388a94202ecb",
    host: "https://mainnet.nebulas.io",
}

function mainnetNebApiCall(data, context, api) {
    data.chainID = 1
    data.to = catMainnet.contractAddress

    var api = api || '/v1/user/call'
    return axios.post(catMainnet.host + api, data).then(function (resp) {
        return resp.data.result
    })
}

var HomeComponent = {
    template: '#home-tpl',
    props: ['page'],
    methods: {
        loadingMore: function () {
            if (this.page == "favTopic") {
                this.offset = this.topicList.nextIndex
            } else {
                this.offset -= this.limit
            }
            if (this.offset < 0) {
                return
            }

            this.loadingMoreStatus = true
            this.loadingMoreText = "正在加载"
            this.fetchTopicList()
        },
        fetchTopicList: function () {
            var _this = this,
                func = "topicList",
                data = [this.limit, this.offset];

            if (this.page == "category") {
                func = "categoryTopicList"
                data = [this.slug, this.limit, this.offset]
            } else if (this.page == "myTopic") {
                func = "userTopicList"

                data = [this.userHash || app.address, this.limit, this.offset]
            } else if (this.page == "favTopic") {
                func = "allFavTopic"
                data = [this.limit, this.offset]
            }

            var body = {
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: "n1jWpKadorv27XgSbo4WRZvsyCdAajkEP4B",
                value: "0",
                // nonce: nonce,
                gasPrice: "1000000",
                gasLimit: "2000000",
                contract: {
                    function: func,
                    args: JSON.stringify(data)
                }
            }
            this.$http.post('https://mainnet.nebulas.io/v1/user/call', body).then(function (resp) {
                return resp.data.result
            }).then(function (resp) {
                // nasApi.call(body)
                _this.loading = false

                var result = JSON.parse(resp.result)
                if (result) {
                    if (_this.offset == -1) {
                        _this.offset = result.total - 1
                    }
                    _this.loadingMoreStatus = false
                    var len = result.topic.length
                    if (!len || len < _this.limit || result.nextIndex == -1) {
                        _this.loadingMoreText = "没有更多内容"
                        _this.loadingMoreDisabled = true
                    } else {
                        _this.loadingMoreText = "加载更多"
                    }
                    _this.topicList.total = result.total
                    _this.topicList.topic = _this.topicList.topic.concat(result.topic)
                    _this.topicList.nextIndex = result.nextIndex
                }
            })
        },
    },
    created: function () {
        var slug = this.$route.params.slug;
        if (!slug) {
            return this.$router.replace({
                path: '/config'
            })
        }

        this.fetchTopicList()
    },
    watch: {
        "$route": function () {
            this.loading = true
            this.slug = this.$route.params.slug
            this.offset = -1
            this.topicList.total = 0
            this.topicList.topic = []
            this.userHash = this.$route.params.hash
            this.fetchTopicList()
        }
    },
    data: function () {
        var slug = this.$route.params.slug;
        return {
            loadingMoreText: "加载更多",
            loadingMoreDisabled: false,
            userHash: "",
            loadingMoreStatus: false,
            loading: true,
            user: {
                nickName: ""
            },
            userNickName: "",
            offset: -1,
            limit: 30,
            slug: slug,
            topicList: {
                total: 0,
                topic: [],
                nextIndex: 0
            }
        }
    }
}



var MyReceivedDonateComponent = {
    template: '#my-received-donate-tpl',
    methods: {
        loadingMore: function () {
            this.loadingMoreStatus = true
            this.fetchMyReceivedDonate()
        },

        fetchMyReceivedDonate: function () {
            var _this = this
            mainnetNebApiCall({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: "0",
                // nonce: nonce,
                gasPrice: "1000000",
                gasLimit: "2000000",
                contract: {
                    function: "donatePage",
                    args: JSON.stringify([{
                        "offset": this.offset,
                        "limit": this.limit,
                        "order": "desc"
                    }])
                }
            }).then(function (resp) {


                _this.loadingMoreStatus = false
                _this.donateListLoading = false
                _this.loadingMoreText = "加载更多"

                var result = JSON.parse(resp.result)

                _this.offset = result.nextId

                _this.donateList.total = result.total
                _this.donateList.donate = _this.donateList.donate.concat(result.items)

                if (result.noMore) {
                    _this.noMoreData = true
                    _this.loadingMoreText = "没有更多数据"
                }
            })

        }
    },
    created: function () {
        this.fetchMyReceivedDonate()
        this.$eventHub.fetchDonateStat()
    },
    data: function () {
        return {
            donateListLoading: true,
            loadingMoreStatus: false,
            loadingMoreText: "加载更多",
            noMoreData: false,
            offset: -1,
            limit: 12,
            donateList: {
                total: 0,
                donate: [],
                getDonateNas: 0
            }
        }
    }
}

var AboutComponent = {
    template: '#about-tpl',
}
var TutorialComponent = {
    template: '#tutorial-tpl',
}

var DonateAddComponent = {
    template: "#donate-add-tpl",
    methods: {
        submitForm: function (formName) {
            var _this = this;
            this.$refs[formName].validate(function (valid) {
                if (!valid) {
                    return;
                }
                if (!_this.donate.content.length > 100) {
                    _this.$message.error("内容不得超过100字符！")
                    return;
                }
                var data = {
                    address: catMainnet.contractAddress,
                    value: _this.donate.value,
                    func: "donateNAS",
                    data: [_this.donate],
                    context: _this,
                    successMsg: "打赏成功",
                    successFunc: function (resp) {
                        _this.$router.push('/donate/received')
                    },
                    options: {
                        qrcode: {
                            showQRCode: true
                        },
                        useMainnet: true
                    }
                }
                _this.$eventHub.$emit("nebPayCall", data)
            })
        }
    },
    data: function () {
        return {
            donateAddRule: {
                name: [{
                    required: true,
                    message: '请输入名称',
                    trigger: 'blur'
                }],
                value: [{
                        required: true,
                        message: '请输入打赏金额',
                        trigger: 'blur'
                    },
                    {
                        type: "number",
                        min: 0.005,
                        message: '最少 0.005 NAS',
                        trigger: 'blur'
                    }
                ],
            },
            donate: {
                "name": "",
                "url": "",
                "content": "",
                "value": 0.1
            }
        }
    }
}
var ConfigComponent = {
    template: "#config-tpl",
    methods: {
        checkActivation: function () {
            var _this = this;
            this.$http.get('http://localhost:8685/_api/checkActivation').then(function (resp) {
                if (resp.data.status_code == 200) {
                    _this.activated = true
                    return
                }
                _this.$confirm('检测你还没有激活此工具，请激活后使用！<p style="color:#F00;">激活时，插件钱包请选择主网！</p><p style="color:#F00;">激活时，插件钱包请选择主网！</p><p style="color:#F00;">激活时，插件钱包请选择主网！</p>', '激活提示', {
                    dangerouslyUseHTMLString: true,
                    confirmButtonText: '立即激活',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(function () {
                    var data = {
                        address: catMainnet.contractAddress,
                        value: "0",
                        func: "activation",
                        data: [],
                        context: _this,
                        successMsg: "激活成功",
                        successFunc: function (resp) {
                            _this.activated = true
                            _this.$http.post('http://localhost:8685/_api/checkActivation', {
                                params:resp
                            }).then(function (rsp) {
                                location.reload()
                            })

                        },
                        options: {
                            qrcode: {
                                showQRCode: true
                            },
                            useMainnet: true
                        }
                    }
                    _this.$eventHub.$emit("nebPayCall", data)


                }).catch(function () {

                });

            })
        },
        callContract: function (action) {
            var callArgs = []
            try {
                callArgs = JSON.parse(this.call.args)
            } catch (e) {
                this.$message.error("合约参数不是一个正确的 JSON 格式")
                return
            }
            var _this = this
            if (action == "test") {
                nasApi.call({
                    chainID: nebState.chain_id,
                    from: app.address || chainInfo.contractAddress,
                    to: "n1jWpKadorv27XgSbo4WRZvsyCdAajkEP4B",
                    value: 0,
                    // nonce: nonce,
                    gasPrice: "1000000",
                    gasLimit: "2000000",
                    contract: {
                        function: this.call.func,
                        args: this.call.args
                    }
                }).then(function (resp) {
                    if (_this.result2json) {
                        resp.result = JSON.parse(resp.result)
                    }
                    _this.call.result = '<pre style="word-break: break-all;line-height: 20px;white-space: pre-wrap;">' + JSON.stringify(resp, null, 2) + '</pre>'
                })
            } else {
                var data = {
                    address: app.contractAddress,
                    value: _this.call.value,
                    func: this.call.func,
                    data: callArgs,
                    context: _this,
                    successMsg: "提交成功",
                    successFunc: function (resp) {

                    },
                }
                _this.$eventHub.$emit("nebPayCall", data)
            }
        },
        saveContractPath: function () {
            if (!this.contractPath) {
                this.$message.error("请输入合约文件路径")
                return false
            }
            try {
                JSON.parse(this.args)
            } catch (error) {
                this.$message.error("部署参数错误，不是一个有效的json格式")
                return false
            }

            localStorage.setItem("contractPath", this.contractPath)
            this.$http.post('http://localhost:8685/_api/contract/path', {
                path: this.contractPath,
                args: this.args,
                call_init: this.call_init,
                remove_data: this.remove_data,
            }).then(({
                data: {
                    status_code,
                    msg
                }
            }) => {
                if (status_code != 200) {
                    this.$message.error(msg)
                    return
                }
                this.$message.success("部署成功")
            })
        }
    },
    created: function () {
        this.checkActivation()
    },
    data: function () {
        return {
            activated: false,
            call: {
                func: "",
                value: 0,
                args: '[]',
                result: ""
            },
            contractPath: localStorage.getItem("contractPath") || "",
            result2json: false,
            args: "[]",
            call_init: false,
            remove_data: false,
        }
    }
}

var routes = [{
        path: '/',
        component: HomeComponent,
        name: "home",
        props: {
            page: "home"
        }
    },
    {
        path: '/donate/add',
        component: DonateAddComponent,
        name: "DonateAddComponent"
    },
    {
        path: '/donate/received',
        component: MyReceivedDonateComponent,
        name: "myReceivedDonate"
    },
    {
        path: '/config',
        component: ConfigComponent,
        name: "config"
    },

    {
        path: '/c/:slug',
        component: HomeComponent,
        name: "category",
        props: {
            page: "category"
        }
    },
    {
        path: '/about',
        component: AboutComponent,
        name: "about"
    },
    {
        path: '/tutorial',
        component: TutorialComponent,
        name: "tutorial"
    },

]

var router = new VueRouter({
    routes: routes
})


Vue.prototype.$eventHub = new Vue({
    created: function () {
        this.$on("checkTransaction", this.checkTransaction)
        this.$on("nebPayCall", this.nebPayCall)
    },
    methods: {
        fetchDonateStat: function () {
            var _this = this
            mainnetNebApiCall({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: "0",
                // nonce: nonce,
                gasPrice: "1000000",
                gasLimit: "2000000",
                contract: {
                    function: "stat",
                    args: JSON.stringify([])
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)
                _this.stat = result
            })
        },
        nebPayCall: function (config) {
            var options = config.options || {},
                serialNumber = "",
                _this = this;
            if (!options.callback) {
                options.callback = chainInfo.payhost
            }

            if (!options.listener) {
                options.listener = function (value) {
                    // mylog("listener:", value, serialNumber)
                    // console.log(value)
                    if (typeof value == 'string') {
                        _this.$notify({
                            title: '错误',
                            message: '用户取消了交易！',
                            duration: 3000,
                            type: 'error'
                        });
                        return
                    }

                    config.serialNumber = serialNumber
                    config.txhash = value.txhash

                    config.transStateNotify = _this.$notify({
                        title: '正在获取交易状态',
                        message: '如你不想等待状态查询，可点击关闭按钮。稍后刷新页面查看最新信息！',
                        duration: 0,
                        type: 'warning'
                    });

                    _this.checkTransaction(config)

                    // this.$eventHub.$emit("checkTransaction", config)
                }
            }
            config.options = options


            serialNumber = nebPay.call(
                config.address,
                config.value,
                config.func,
                JSON.stringify(config.data),
                options
            );

            console.log("生成的serialNumber：", serialNumber)
        },
        checkTransaction: function (config) {
            // var config = {
            //     serialNumber:serialNumber,
            //     successMsg:"更新信息成功",
            //     successFunc:this.xxxxx,
            //     context: this
            // }
            var serialNumber = config.serialNumber,
                context = config.context,
                minInterval = 6,
                intervalTime = config.intervalTime || minInterval,
                timeOut = config.timeOut || 60; //60秒后超时
            if (intervalTime < minInterval) { //API限制每分钟最多查询6次
                intervalTime = minInterval
            }
            var timeOutId = 0
            var timerId = setInterval(function () {
                // mylog("查询：", serialNumber)
                var req
                if (config.options.useMainnet) {
                    req = mainnetNebApiCall({
                        hash: config.txhash
                    }, context, '/v1/user/getTransactionReceipt')
                } else {
                    req = nasApi.getTransactionReceipt({
                        hash: config.txhash
                    })
                }
                req.then(function (receipt) {
                    // status Transaction status, 0 failed, 1 success, 2 pending.
                    // mylog("receipt:",receipt)

                    if (receipt.status === 1) {
                        clearInterval(timerId)
                        config.transStateNotify.close()

                        if (timeOutId) {
                            clearTimeout(timeOutId)
                        }

                        if (config.successMsg) {
                            // context.$message.success(config.successMsg)
                            context.$notify({
                                title: '操作成功',
                                message: config.successMsg,
                                type: 'success'
                            });

                        }
                        // mylog(context)
                        if (config.successFunc) {
                            setTimeout(function () {
                                config.successFunc(receipt)
                            }, 300)

                        }
                    } else if (receipt.status === 0) { //错误
                        // "Error: 10008"
                        context.$message.error(getErrMsg(receipt.execute_result))
                        clearInterval(timerId)
                        config.transStateNotify.close()

                        if (timeOutId) {
                            clearTimeout(timeOutId)
                        }

                        if (config.failFunc) {
                            setTimeout(function () {
                                config.failFunc(receipt)
                            }, 300)

                        }
                    }
                }).catch(function (err) {
                    context.$message.error("查询交易结果发生了错误！" + err)
                });
            }, intervalTime * 1000)
            timeOutId = setTimeout(function () {
                config.transStateNotify.close()
                if (timerId) {
                    context.$message.error("查询超时！请稍后刷新页面查看最新内容！")
                    clearInterval(timerId)
                }
            }, timeOut * 1000)
        }
    },
    data: function () {
        return {
            stat: {
                donateNums: 0,
                regNums: 0,
                totalDonateNas: 0
            },
            categoryList: {
                total: 0,
                category: []
            }
        }
    }
});


var defaultData = {
    visible: true,
    activeIndex: 'home',
    nasApi: nasApi,
    balance: 0,
    account: null,
    address: "",
    nebState: null,
    userLoad: false,
    user: {
        avatar: "",
        nickName: "",
        weibo: "",
        twitter: "",
        facebook: "",
        bio: "",
        website: "",
        company: "",
        job: "",
        topicNums: 0,
        replyNums: 0,
        fllowNums: 0,
        fansNums: 0,
        favCategoryNums: 0,
        favTopicNums: 0,
    },
    categoryList: {
        total: 0,
        category: []
    },
    accountState: null,
    contractAddress: chainInfo.contractAddress,
    chainnetConfig: chainnetConfig,
    chainStr: chainInfo.name,
    chainnet: chain,
    bbsStatus: {
        userNums: 0,
        topicNums: 0,
        replyNums: 0
    }
}



var Main = {
    router: router,
    mounted: function () {

    },
    methods: {
        changChain: function (chain) {
            if (chain == "mainnet") {
                this.chainStr = "主网"
            } else if (chain == "testnet") {
                this.chainStr = "测试网"
            }
            this.chain = chain
            localStorage.setItem("chain", chain)
            location.reload()
        },
        fetchAccountState: function () {
            var _this = this;

            if (!app.address) {
                return
            }
            this.nasApi.getAccountState({
                address: app.address
            }).then(function (resp) {
                if (resp.error) {
                    this.$message.error(resp.error)
                }
                var amount = Unit.fromBasic(Utils.toBigNumber(resp.balance), "nas").toNumber()
                app.balance = amount

                _this.accountState = resp
            });
        },

        updateUserInfo: function () {
            // this.fetchUserInfo()
            this.fetchAccountState()
        },
        showMenu: function () {
            var style = this.menuStatus ? "display:none" : "display:block"
            document.getElementById("left-menu").style = style
            document.getElementById("right-menu").style = style

            this.menuStatus = !this.menuStatus
        },

    },
    watch: {
        address: function (n) {
            mylog("watch address :" + n)
            localStorage.setItem('address', n)
            this.updateUserInfo()
        }
    },
    data: function () {
        defaultData.hotCategory = []
        defaultData.ads = []
        defaultData.hotTopics = {
            lastUpdate: "",
            topics: []
        }
        var address = localStorage.getItem('address') || ""
        defaultData.address = address
        defaultData.menuStatus = false
        defaultData.noExtension = typeof (webExtensionWallet) === "undefined"
        return defaultData
    }
}

var defaultAvatar = 'data:image/png;base64,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'

Vue.filter("dateFormat", function (value) {
    var date = new Date(value * 1000)
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
})
Vue.filter("buildAvatar", function (value) {
    if (!value) {
        return defaultAvatar
    }
    return value
})
Vue.filter('buildTopicUrl', function (value) {
    return 'https://bbs.forfunapp.com/#/topic/' + value
})
var hiddenTopic = {
    "c3d9e390d54f224a6636a12445e3be85b28914d431f7788c8150a904b1e2b86f": true
}
Vue.mixin({
    methods: {
        checkHiddenTopic: function (hash) {
            if (hiddenTopic[hash]) {
                return false
            }
            return true
        }
    }
})

// md 转换为 HTML
// function contentFormat(value) {
//     return markdown.toHTML(value)
// }

// Vue.filter("contentFormat", contentFormat)

Vue.filter("fromBasicNas", function (value) {
    return Unit.fromBasic(Utils.toBigNumber(value, "nas")).toNumber()
})


defaultData.nebState = state


cls = Vue.extend(Main)
app = new cls()

getWallectInfo()

app.$mount('#app')

function getWallectInfo() {
    window.addEventListener('message', function (e) {
        if (e.data && e.data.data) {
            mylog("e.data.data:", e.data.data)
            if (e.data.data.account) {
                app.address = e.data.data.account
                app.updateUserInfo()
            }
        }
    })

    window.postMessage({
        "target": "contentscript",
        "data": {},
        "method": "getAccount",
    }, "*");
}