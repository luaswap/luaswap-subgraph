/* eslint-disable prefer-const */
import { Pair, Token, Bundle } from '../types/schema'
import { BigDecimal, Address, BigInt } from '@graphprotocol/graph-ts/index'
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from './helpers'

const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
// TODO: Old code calculate eth price in usd
// const USDC_WETH_PAIR = '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc' // created 10008355
// const DAI_WETH_PAIR = '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11' // created block 10042267
// const USDT_WETH_PAIR = '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852' // created block 10093341
// End Old code calculate eth price in usd

// TODO: Need to change when deploy new contract
const LUA_WETH_PAIR = '0x65fabaf7e6c5380243e063d8559d84e589db6438'
const TOMO_WETH_PAIR = '0x7885e359a085372ebcf1ed6829402f149d02c600'
const TOMO_USDC_PAIR = '0xb10c1840f562f0ac914da2bad3290833c75fdddf'
const LUA_USDC_PAIR = '0x96258bb42779bf300cf69c9b5bd2ba5245cb4bc4'

export function getEthPriceInUSD(): BigDecimal {
  // TODO: Old code calculate eth price in usd
  // // fetch eth prices for each stablecoin
  // let daiPair = Pair.load(DAI_WETH_PAIR) // dai is token0
  // let usdcPair = Pair.load(USDC_WETH_PAIR) // usdc is token0
  // let usdtPair = Pair.load(USDT_WETH_PAIR) // usdt is token1

  // // all 3 have been created
  // if (daiPair !== null && usdcPair !== null && usdtPair !== null) {
  //   let totalLiquidityETH = daiPair.reserve1.plus(usdcPair.reserve1).plus(usdtPair.reserve0)
  //   let daiWeight = daiPair.reserve1.div(totalLiquidityETH)
  //   let usdcWeight = usdcPair.reserve1.div(totalLiquidityETH)
  //   let usdtWeight = usdtPair.reserve0.div(totalLiquidityETH)
  //   return daiPair.token0Price
  //     .times(daiWeight)
  //     .plus(usdcPair.token0Price.times(usdcWeight))
  //     .plus(usdtPair.token1Price.times(usdtWeight))
  //   // dai and USDC have been created
  // } else if (daiPair !== null && usdcPair !== null) {
  //   let totalLiquidityETH = daiPair.reserve1.plus(usdcPair.reserve1)
  //   let daiWeight = daiPair.reserve1.div(totalLiquidityETH)
  //   let usdcWeight = usdcPair.reserve1.div(totalLiquidityETH)
  //   return daiPair.token0Price.times(daiWeight).plus(usdcPair.token0Price.times(usdcWeight))
  //   // USDC is the only pair so far
  // } else if (usdcPair !== null) {
  //   return usdcPair.token0Price
  // } else {
  //   return ZERO_BD
  // }
  // End Old code calculate eth price in usd

  // fetch eth prices for each pairs
  let luaWethPair = Pair.load(LUA_WETH_PAIR) // weth is token1
  let luaUsdcPair = Pair.load(LUA_USDC_PAIR) // usdc is token0
  
  let tomoWethPair = Pair.load(TOMO_WETH_PAIR) // weth is token1
  let tomoUsdcPair = Pair.load(TOMO_USDC_PAIR) // usdc is token1

  if(luaWethPair != null && luaUsdcPair != null
    && tomoWethPair != null && tomoUsdcPair != null) {

      let totalLiquidityETH = luaWethPair.reserve1.plus(tomoWethPair.reserve1)
      let luaWeight = luaWethPair.reserve1.div(totalLiquidityETH)
      let tomoWeight = tomoWethPair.reserve1.div(totalLiquidityETH)
      let wethPriceBasedOnLua = luaWethPair.token0Price.times(luaUsdcPair.token0Price)
      let wethPriceBasedOnTomo = tomoWethPair.token0Price.times(tomoUsdcPair.token1Price)
    
      return wethPriceBasedOnLua
              .times(luaWeight)
              .plus(wethPriceBasedOnTomo.times(tomoWeight))
  } else {
    return BigDecimal.fromString('400')
  }
  
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x05d3606d5c81eb9b7b18530995ec9b29da05faba', // TOMOE
  '0xb1f66997a5760428d3a87d68b90bfe0ae64121cc', // LUA
]

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
// TODO: Don't limit in luaswap
// let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('400000')
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('-1')

// minimum liquidity for price to get tracked
// TODO: Don't limit in luaswap
// let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString('2')
let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString('-1')

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token): BigDecimal {
  if (token.id == WETH_ADDRESS) {
    return ONE_BD
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]))
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString())
      if (pair.token0 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token1 = Token.load(pair.token1)
        return pair.token1Price.times(token1.derivedETH as BigDecimal) // return token1 per our token * Eth per token 1
      }
      if (pair.token1 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token0 = Token.load(pair.token0)
        return pair.token0Price.times(token0.derivedETH as BigDecimal) // return token0 per our token * ETH per token 0
      }
    }
  }
  return ZERO_BD // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedETH.times(bundle.ethPrice)
  let price1 = token1.derivedETH.times(bundle.ethPrice)

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    let reserve0USD = pair.reserve0.times(price0)
    let reserve1USD = pair.reserve1.times(price1)
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (reserve0USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve1USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0
      .times(price0)
      .plus(tokenAmount1.times(price1))
      .div(BigDecimal.fromString('2'))
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0)
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1)
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedETH.times(bundle.ethPrice)
  let price1 = token1.derivedETH.times(bundle.ethPrice)

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}
