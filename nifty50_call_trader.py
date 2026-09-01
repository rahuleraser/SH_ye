import os
import time
import logging
from datetime import date

# --- TEST MODE ---
# TEST_MODE=1 runs with dummy data (no dhanhq, no live orders).
TEST_MODE = os.getenv("TEST_MODE", "0") == "1"

# --- CONFIGURATION ---
CLIENT_ID = os.getenv("DHAN_CLIENT_ID", "YOUR_DHAN_CLIENT_ID")
ACCESS_TOKEN = os.getenv("DHAN_ACCESS_TOKEN", "YOUR_DHAN_ACCESS_TOKEN")

NIFTY_SEC_ID = 13
NIFTY_SEGMENT = "IDX_I"
NIFTY_LOT_SIZE = 75
LOTS = 1
ORDER_QTY = NIFTY_LOT_SIZE * LOTS

BID_DISCOUNT_RS = 5.0
STOP_LOSS_RS = 3.0
TRAIL_ACTIVATE_RS = 4.0

# 100 iterations, wait 30 seconds after each scan
MAX_SCANS = 100
SCAN_INTERVAL_SEC = 30

# Dummy market: Nifty 24850, nearest ITM call 24800 CE @ 52.50, bid 47.50
DUMMY_NIFTY_LTP = 24850.40
DUMMY_EXPIRY = date.today().isoformat()
DUMMY_CALLS = [
    {"strike": 24800, "ltp": 52.50, "security_id": "44001", "symbol": "NIFTY 24800 CE"},
    {"strike": 24750, "ltp": 85.00, "security_id": "44002", "symbol": "NIFTY 24750 CE"},
    {"strike": 24700, "ltp": 122.00, "security_id": "44003", "symbol": "NIFTY 24700 CE"},
    {"strike": 24650, "ltp": 162.00, "security_id": "44004", "symbol": "NIFTY 24650 CE"},
]
# After bid: pending, pending, fill@47.50, hold, trail, trail, dip (sell)
DUMMY_CALL_LTP_SEQUENCE = [52.50, 50.80, 47.50, 48.60, 52.10, 56.40, 55.90, 54.80]

if TEST_MODE:
    class DummyDhan:
        BUY = "BUY"
        SELL = "SELL"
        MARKET = "MARKET"
        LIMIT = "LIMIT"
        INTRA = "INTRADAY"
        NSE_FNO = "NSE_FNO"

        def __init__(self):
            self._scan = 0
            self._order_id = "DUMMY-NIFTY-BID-001"
            self._filled = False
            self._sold = False

        def ticker_data(self, securities):
            return {
                "status": "success",
                "data": {"IDX_I": {str(NIFTY_SEC_ID): {"last_price": DUMMY_NIFTY_LTP}}},
            }

        def expiry_list(self, under_security_id, under_exchange_segment):
            return {"status": "success", "data": {"expiry_list": [DUMMY_EXPIRY]}}

        def option_chain(self, under_security_id, under_exchange_segment, expiry):
            oc = {}
            for c in DUMMY_CALLS:
                key = f"{c['strike']:.6f}"
                oc[key] = {
                    "ce": {
                        "last_price": c["ltp"],
                        "security_id": c["security_id"],
                        "symbol": c["symbol"],
                    }
                }
            return {
                "status": "success",
                "data": {"last_price": DUMMY_NIFTY_LTP, "oc": oc},
            }

        def get_ltp(self, instruments):
            ltp = self._current_call_ltp()
            return {
                "status": "success",
                "data": {DUMMY_CALLS[0]["security_id"]: {"last_price": ltp}},
            }

        def place_order(self, **kwargs):
            txn = kwargs.get("transaction_type")
            if txn == self.BUY:
                return {
                    "status": "success",
                    "data": {"orderId": self._order_id},
                    "params": kwargs,
                }
            self._sold = True
            return {
                "status": "success",
                "data": {"orderId": "DUMMY-NIFTY-SELL-001"},
                "params": kwargs,
            }

        def get_order_by_id(self, order_id):
            ltp = self._current_call_ltp()
            if not self._filled and ltp <= 47.50:
                self._filled = True
            status = "TRADED" if self._filled else "PENDING"
            avg = 47.50 if self._filled else 0
            return {
                "status": "success",
                "data": {
                    "orderId": order_id,
                    "orderStatus": status,
                    "averageTradedPrice": avg,
                    "filledQty": ORDER_QTY if self._filled else 0,
                    "quantity": ORDER_QTY,
                },
            }

        def get_positions(self):
            if self._filled and not self._sold:
                return {
                    "status": "success",
                    "data": [
                        {
                            "securityId": DUMMY_CALLS[0]["security_id"],
                            "exchangeSegment": "NSE_FNO",
                            "netQty": ORDER_QTY,
                            "positionType": "LONG",
                            "buyAvg": 47.50,
                            "productType": "INTRADAY",
                        }
                    ],
                }
            return {"status": "success", "data": []}

        def _current_call_ltp(self):
            idx = min(self._scan, len(DUMMY_CALL_LTP_SEQUENCE) - 1)
            return DUMMY_CALL_LTP_SEQUENCE[idx]

        def next_scan(self):
            self._scan += 1

    dhan = DummyDhan()
else:
    from dhanhq import dhanhq

    dhan = dhanhq(CLIENT_ID, ACCESS_TOKEN)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


def _ok(resp):
    return isinstance(resp, dict) and resp.get("status") == "success" and "data" in resp


def get_nifty_ltp():
    try:
        resp = dhan.ticker_data({"IDX_I": [NIFTY_SEC_ID]})
        if not _ok(resp):
            return None
        data = resp["data"]
        block = data.get("IDX_I") or data.get("data", {}).get("IDX_I") or data
        if isinstance(block, dict):
            node = block.get(str(NIFTY_SEC_ID)) or block.get(NIFTY_SEC_ID) or block
            if isinstance(node, dict):
                return float(node.get("last_price") or node.get("LTP") or 0) or None
        return None
    except Exception as e:
        logging.error("Error fetching Nifty LTP: %s", e)
        return None


def get_today_expiry():
    today = date.today().isoformat()
    try:
        resp = dhan.expiry_list(NIFTY_SEC_ID, NIFTY_SEGMENT)
        if not _ok(resp):
            return None, False
        data = resp["data"]
        expiries = data.get("expiry_list") or data.get("data") or []
        if isinstance(expiries, dict):
            expiries = expiries.get("expiry_list", [])
        expiries = [str(x)[:10] for x in expiries]
        return today, today in expiries
    except Exception as e:
        logging.error("Error fetching expiry list: %s", e)
        return today, False


def fetch_itm_calls(nifty_ltp, expiry):
    try:
        resp = dhan.option_chain(NIFTY_SEC_ID, NIFTY_SEGMENT, expiry)
        if not _ok(resp):
            return []
        oc = resp["data"].get("oc") or {}
        calls = []
        for strike_key, chain in oc.items():
            try:
                strike = float(strike_key)
            except (TypeError, ValueError):
                continue
            if strike >= nifty_ltp:
                continue
            ce = (chain or {}).get("ce") or {}
            ltp = ce.get("last_price")
            sec_id = ce.get("security_id") or ce.get("securityId")
            if ltp is None or not sec_id:
                continue
            calls.append(
                {
                    "strike": strike,
                    "ltp": float(ltp),
                    "security_id": str(sec_id),
                    "symbol": ce.get("symbol") or f"NIFTY {int(strike)} CE",
                }
            )
        calls.sort(key=lambda c: c["strike"], reverse=True)
        return calls
    except Exception as e:
        logging.error("Error fetching option chain: %s", e)
        return []


def get_call_ltp(security_id):
    try:
        quote = dhan.get_ltp([("NSE_FNO", str(security_id))])
        if _ok(quote):
            node = quote["data"].get(str(security_id), {})
            ltp = node.get("last_price")
            if ltp is not None:
                return float(ltp)
        return None
    except Exception as e:
        logging.error("Error fetching call LTP for %s: %s", security_id, e)
        return None


def place_limit_bid(security_id, price):
    try:
        resp = dhan.place_order(
            security_id=str(security_id),
            exchange_segment=getattr(dhan, "NSE_FNO", "NSE_FNO"),
            transaction_type=dhan.BUY,
            quantity=int(ORDER_QTY),
            order_type=getattr(dhan, "LIMIT", "LIMIT"),
            product_type=getattr(dhan, "INTRA", "INTRADAY"),
            price=float(price),
        )
        logging.info("[BID PLACED] 1 lot qty=%s @ ₹%.2f | %s", ORDER_QTY, price, resp)
        if _ok(resp):
            return resp["data"].get("orderId") or resp["data"].get("order_id")
        return None
    except Exception as e:
        logging.error("[BID FAILED] %s", e)
        return None


def get_order_fill(order_id):
    try:
        resp = dhan.get_order_by_id(order_id)
        if not _ok(resp):
            return False, 0.0, 0
        data = resp["data"]
        if isinstance(data, list) and data:
            data = data[0]
        status = str(data.get("orderStatus") or data.get("order_status") or "").upper()
        filled_qty = int(data.get("filledQty") or data.get("filled_qty") or 0)
        avg = float(data.get("averageTradedPrice") or data.get("average_traded_price") or 0)
        traded = status in ("TRADED", "TRADED ", "COMPLETE", "FILLED") or filled_qty >= ORDER_QTY
        return traded, avg, filled_qty
    except Exception as e:
        logging.error("Error checking order %s: %s", order_id, e)
        return False, 0.0, 0


def place_market_sell(security_id, qty, reason):
    try:
        resp = dhan.place_order(
            security_id=str(security_id),
            exchange_segment=getattr(dhan, "NSE_FNO", "NSE_FNO"),
            transaction_type=dhan.SELL,
            quantity=int(qty),
            order_type=getattr(dhan, "MARKET", "MARKET"),
            product_type=getattr(dhan, "INTRA", "INTRADAY"),
            price=0,
        )
        logging.info("[SELL ORDER] reason=%s qty=%s | %s", reason, qty, resp)
        return True
    except Exception as e:
        logging.error("[SELL FAILED] %s", e)
        return False


def print_screen(title, rows):
    width = 62
    print("=" * width)
    print(f" {title}")
    print("=" * width)
    for label, value in rows:
        print(f" {label:<22}: {value}")
    print("=" * width)
    print()


def run_trader():
    mode = "TEST (dummy data)" if TEST_MODE else "LIVE"
    logging.info("Starting Nifty50 same-day Call trader [%s]", mode)

    nifty_ltp = get_nifty_ltp()
    if not nifty_ltp:
        logging.error("Could not read Nifty50 LTP. Exiting.")
        return

    expiry, is_today = get_today_expiry()
    print_screen(
        "NIFTY50 LIVE CHECK",
        [
            ("Mode", mode),
            ("Nifty50 LTP", f"₹{nifty_ltp:.2f}"),
            ("Today", date.today().isoformat()),
            ("Current expiry", expiry or "unknown"),
            ("Today expiry?", "YES - TRADE ALLOWED" if is_today else "NO - DO NOT TRADE"),
            ("Iterations", str(MAX_SCANS)),
            ("Interval", f"{SCAN_INTERVAL_SEC} seconds"),
        ],
    )

    if not is_today:
        logging.warning("Expiry is not today. No bid will be placed.")
        return

    calls = fetch_itm_calls(nifty_ltp, expiry)
    if not calls:
        logging.error("No Call found with strike less than Nifty LTP ₹%.2f", nifty_ltp)
        return

    print_screen(
        "CALLS WITH STRIKE < NIFTY SPOT",
        [(c["symbol"], f"Strike ₹{c['strike']:.0f} | LTP ₹{c['ltp']:.2f}") for c in calls],
    )

    selected = calls[0]
    call_ltp = selected["ltp"]
    bid_price = round(call_ltp - BID_DISCOUNT_RS, 2)
    if bid_price <= 0:
        logging.error("Bid price ₹%.2f is invalid. Exiting.", bid_price)
        return

    print_screen(
        "SELECTED CALL / BID",
        [
            ("Call", selected["symbol"]),
            ("Security ID", selected["security_id"]),
            ("Call LTP", f"₹{call_ltp:.2f}"),
            ("Bid (LTP - 5)", f"₹{bid_price:.2f}"),
            ("Quantity", f"{LOTS} lot ({ORDER_QTY})"),
            ("Stop loss", f"Buy - ₹{STOP_LOSS_RS:.2f}"),
            ("Trail activate", f"+ ₹{TRAIL_ACTIVATE_RS:.2f}"),
            ("Iterations", f"{MAX_SCANS} scans"),
            ("Interval", f"{SCAN_INTERVAL_SEC} seconds each"),
        ],
    )

    order_id = place_limit_bid(selected["security_id"], bid_price)
    if not order_id:
        logging.error("Limit bid was not accepted. Exiting.")
        return

    buy_value = None
    trailed = False
    position_open = False
    scan_count = 0

    while scan_count < MAX_SCANS:
        scan_count += 1
        logging.info("--- Scan %s of %s ---", scan_count, MAX_SCANS)
        if TEST_MODE:
            dhan._scan = scan_count - 1

        live_call = get_call_ltp(selected["security_id"]) or call_ltp
        live_nifty = get_nifty_ltp() or nifty_ltp

        if not position_open:
            filled, avg, filled_qty = get_order_fill(order_id)
            print_screen(
                f"WAITING FOR BID FILL  (scan {scan_count})",
                [
                    ("Nifty50", f"₹{live_nifty:.2f}"),
                    ("Call", selected["symbol"]),
                    ("Call LTP", f"₹{live_call:.2f}"),
                    ("Bid", f"₹{bid_price:.2f}"),
                    ("Filled qty", f"{filled_qty}/{ORDER_QTY}"),
                    ("Status", "FILLED - 1 LOT BOUGHT" if filled else "PENDING"),
                ],
            )
            if filled and filled_qty >= ORDER_QTY:
                buy_value = avg if avg > 0 else bid_price
                position_open = True
                logging.info("[FILLED] 1 lot bought @ ₹%.2f", buy_value)
            elif scan_count < MAX_SCANS:
                time.sleep(SCAN_INTERVAL_SEC)
            continue

        drop_from_buy = buy_value - live_call
        gain_from_buy = live_call - buy_value
        sl_price = buy_value - STOP_LOSS_RS if not trailed else buy_value

        print_screen(
            f"POSITION MONITOR  (scan {scan_count})",
            [
                ("Nifty50", f"₹{live_nifty:.2f}"),
                ("Call", selected["symbol"]),
                ("Buy value", f"₹{buy_value:.2f}"),
                ("Current call", f"₹{live_call:.2f}"),
                ("P&L / lot pt", f"₹{gain_from_buy:.2f}"),
                ("Stop / sell lvl", f"₹{sl_price:.2f}"),
                ("Trailed", "YES" if trailed else "NO"),
            ],
        )

        if live_call <= buy_value - STOP_LOSS_RS and not trailed:
            msg = (
                f"SELL NOW | STOP LOSS | Call LTP ₹{live_call:.2f} is "
                f"₹{drop_from_buy:.2f} below buy ₹{buy_value:.2f}"
            )
            print("\n" + "!" * 62)
            print(f" {msg}")
            print("!" * 62 + "\n")
            logging.warning("[STOP LOSS] %s", msg)
            place_market_sell(selected["security_id"], ORDER_QTY, "STOP_LOSS")
            position_open = False
            break

        if live_call - buy_value >= TRAIL_ACTIVATE_RS:
            old = buy_value
            buy_value = live_call
            trailed = True
            logging.info(
                "[TRAIL] Buy value moved ₹%.2f -> ₹%.2f (gain >= ₹%.2f)",
                old,
                buy_value,
                TRAIL_ACTIVATE_RS,
            )
            print_screen(
                "BUY VALUE UPDATED (TRAIL)",
                [
                    ("Old buy value", f"₹{old:.2f}"),
                    ("New buy value", f"₹{buy_value:.2f}"),
                    ("Current call", f"₹{live_call:.2f}"),
                ],
            )
        elif trailed and live_call < buy_value:
            msg = (
                f"SELL NOW | TRAILED BUY VALUE BROKEN | Call LTP ₹{live_call:.2f} "
                f"is less than buy value ₹{buy_value:.2f}"
            )
            print("\n" + "!" * 62)
            print(f" {msg}")
            print("!" * 62 + "\n")
            logging.warning("[SELL SIGNAL] %s", msg)
            place_market_sell(selected["security_id"], ORDER_QTY, "TRAIL_BROKEN")
            position_open = False
            break

        if scan_count < MAX_SCANS:
            time.sleep(SCAN_INTERVAL_SEC)

    logging.info("Scanner finished after %s scan(s).", scan_count)


if __name__ == "__main__":
    run_trader()
