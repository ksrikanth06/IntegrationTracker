"""
Regenerate logs.json with proper transaction-based sequences.
Each transaction: Start -> [Info] -> Success | Failure
Success rate is ~70% of transactions.
"""
import json, random, uuid, datetime
from collections import Counter

random.seed(42)

interfaces = json.load(open('src/data/interfaces.json'))

NOW = datetime.datetime.now(datetime.timezone.utc)
WINDOW_SEC = 23 * 3600

SERVERS = ['UTIN01', 'UTIN02', 'UTIN03', 'UTIN04', 'UTIN05', 'UTIN06', 'UTIN07', 'UTIN08']

VERBS = ['route', 'process', 'validate', 'transform', 'dispatch', 'sync', 'push', 'fetch', 'submit', 'forward']
NOUNS = ['Message', 'Payload', 'Order', 'Shipment', 'Invoice', 'Record', 'Event', 'Batch', 'Request', 'Data']

ERROR_TYPES = ['TIMEOUT', 'CONNECTION_ERROR', 'VALIDATION_ERROR', 'AUTH_FAILURE', 'MAPPING_ERROR', 'TRANSFORM_ERROR', 'SERVICE_UNAVAILABLE']

START_MSGS = [
    'Transaction initiated — inbound payload received',
    'Incoming request accepted, starting processing',
    'Integration triggered by source system',
    'Transaction started — routing to target adapter',
    'Request received from source, beginning workflow',
]
INFO_MSGS = [
    'Payload transformation in progress',
    'Validating message schema against target spec',
    'Enriching request with lookup data',
    'Mapping source fields to target format',
    'Calling downstream service endpoint',
    'Applying business rules to incoming data',
    'Checkpoint: message validated, proceeding to delivery',
]
SUCCESS_MSGS = [
    'Integration completed — payload forwarded successfully',
    'Transaction committed to target system',
    'Message delivered and acknowledged by target',
    'Workflow completed, response received from target',
    'Outbound message accepted, transaction closed',
]
FAILURE_MSGS = [
    'Transaction failed — target system returned error',
    'Payload delivery failed after maximum retries',
    'Processing aborted due to validation failure',
    'Timeout exceeded waiting for target response',
    'Connection to target system could not be established',
    'Data mapping failed — incompatible schema',
    'Authentication rejected by target service',
]


def make_ts(dt: datetime.datetime) -> str:
    return dt.strftime('%Y-%m-%dT%H:%M:%S.') + f'{random.randint(0, 999):03d}Z'


logs = []
id_seq = 1000000  # 7-digit sequence counter

for iface in interfaces:
    iid    = iface['InterfaceID']
    pkg    = iface.get('PackageName') or 'com.example'
    server = random.choice(SERVERS)
    service = f"{pkg}.priv.flow:{random.choice(VERBS)}{random.choice(NOUNS)}"

    n_transactions = random.randint(10, 18)

    for _ in range(n_transactions):
        txn_id = str(uuid.uuid4())
        offset  = random.randint(0, WINDOW_SEC)
        t       = NOW - datetime.timedelta(seconds=offset)

        req_payload = json.dumps({
            'transactionId': txn_id,
            'interfaceId': iid,
            'source': iface.get('SourceApplication', 'SRC'),
            'target': iface.get('TargetApplication', 'TGT'),
            'timestamp': make_ts(t),
        })

        include_info = random.random() < 0.60
        is_success   = random.random() < 0.70

        step_delta = datetime.timedelta(seconds=random.randint(1, 8))

        # ── Step 1: Start ──────────────────────────────────────────────────────
        id_seq += 1
        logs.append({
            'ID':              str(id_seq),
            'InterfaceID':     iid,
            'TransactionID':   txn_id,
            'EventType':       'Start',
            'ErrorType':       'NULL',
            'ServiceName':     service,
            'LogMessage':      random.choice(START_MSGS),
            'ServerName':      server,
            'PackageName':     pkg,
            'CreatedDate':     make_ts(t),
            'DisplayOrder':    '1',
            'IsAutoRetry':     '0',
            'RequestPayload':  req_payload,
            'ResponsePayload': 'NULL',
            'ErrorPayload':    'NULL',
            'CreatedBy':       'SYSTEM',
            'ModifiedBy':      'NULL',
            'ModifiedDate':    'NULL',
            'IsActive':        '1',
        })
        t += step_delta

        # ── Step 2: Info (optional) ────────────────────────────────────────────
        if include_info:
            id_seq += 1
            logs.append({
                'ID':              str(id_seq),
                'InterfaceID':     iid,
                'TransactionID':   txn_id,
                'EventType':       'Info',
                'ErrorType':       'NULL',
                'ServiceName':     service,
                'LogMessage':      random.choice(INFO_MSGS),
                'ServerName':      server,
                'PackageName':     pkg,
                'CreatedDate':     make_ts(t),
                'DisplayOrder':    '2',
                'IsAutoRetry':     '0',
                'RequestPayload':  'NULL',
                'ResponsePayload': 'NULL',
                'ErrorPayload':    'NULL',
                'CreatedBy':       'SYSTEM',
                'ModifiedBy':      'NULL',
                'ModifiedDate':    'NULL',
                'IsActive':        '1',
            })
            t += step_delta

        # ── Step 3: Success or Failure ─────────────────────────────────────────
        final_order = '3' if include_info else '2'
        if is_success:
            resp = json.dumps({
                'statusCode': '0',
                'status': 'Success',
                'statusMsg': 'Request processed successfully',
                'transactionId': txn_id,
                'service': service.split('.')[-1],
            })
            id_seq += 1
            logs.append({
                'ID':              str(id_seq),
                'InterfaceID':     iid,
                'TransactionID':   txn_id,
                'EventType':       'Success',
                'ErrorType':       'NULL',
                'ServiceName':     service,
                'LogMessage':      random.choice(SUCCESS_MSGS),
                'ServerName':      server,
                'PackageName':     pkg,
                'CreatedDate':     make_ts(t),
                'DisplayOrder':    final_order,
                'IsAutoRetry':     '0',
                'RequestPayload':  'NULL',
                'ResponsePayload': resp,
                'ErrorPayload':    'NULL',
                'CreatedBy':       'SYSTEM',
                'ModifiedBy':      'NULL',
                'ModifiedDate':    'NULL',
                'IsActive':        '1',
            })
        else:
            err_type = random.choice(ERROR_TYPES)
            err_payload = json.dumps({
                'errorCode': err_type,
                'errorMsg': random.choice(FAILURE_MSGS),
                'transactionId': txn_id,
                'retryCount': str(random.randint(0, 3)),
            })
            id_seq += 1
            logs.append({
                'ID':              str(id_seq),
                'InterfaceID':     iid,
                'TransactionID':   txn_id,
                'EventType':       'Failure',
                'ErrorType':       err_type,
                'ServiceName':     service,
                'LogMessage':      random.choice(FAILURE_MSGS),
                'ServerName':      server,
                'PackageName':     pkg,
                'CreatedDate':     make_ts(t),
                'DisplayOrder':    final_order,
                'IsAutoRetry':     '1' if random.random() < 0.4 else '0',
                'RequestPayload':  'NULL',
                'ResponsePayload': 'NULL',
                'ErrorPayload':    err_payload,
                'CreatedBy':       'SYSTEM',
                'ModifiedBy':      'NULL',
                'ModifiedDate':    'NULL',
                'IsActive':        '1',
            })

# Sort newest-first by CreatedDate
logs.sort(key=lambda x: x['CreatedDate'], reverse=True)

with open('src/data/logs.json', 'w') as f:
    json.dump(logs, f, indent=2)

# Stats
ec = Counter(l['EventType'] for l in logs)
txn_outcomes: dict[str, str] = {}
for l in logs:
    if l['EventType'] in ('Success', 'Failure'):
        txn_outcomes[l['TransactionID']] = l['EventType']
total_txns   = len(txn_outcomes)
success_txns = sum(1 for v in txn_outcomes.values() if v == 'Success')

print(f"Total logs      : {len(logs)}")
print(f"Event breakdown : {dict(ec)}")
print(f"Total txns      : {total_txns}")
print(f"Success txns    : {success_txns}  ({100*success_txns//total_txns}%)")
print(f"Failure txns    : {total_txns - success_txns}  ({100*(total_txns-success_txns)//total_txns}%)")
