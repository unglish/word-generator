"""Create one socket condition on a Supabase port, then report it.

established: outbound TCP connection whose kernel-assigned local port is 54322, held open
timewait:    same, then actively closed so the local side sits in TIME_WAIT
listen:      a listener on 0.0.0.0:54322 (positive control for the error text)
reserved:    ports 54320-54329 reserved; open outbound connections until the
             narrowed range is exhausted and assert none landed in the reserved block
"""
import socket
import sys
import time

HOST = ("public.ecr.aws", 443)
mode = sys.argv[1]
held = []

if mode == "listen":
    s = socket.socket()
    s.bind(("0.0.0.0", 54322))
    s.listen()
    held.append(s)
elif mode in ("established", "timewait"):
    s = socket.create_connection(HOST, timeout=10)  # kernel autobinds the local port
    print("autobound local", s.getsockname(), flush=True)
    assert s.getsockname()[1] == 54322, "kernel did not pick 54322"
    if mode == "timewait":
        s.close()  # we close first -> our side enters TIME_WAIT
    else:
        held.append(s)
elif mode == "reserved":
    ports = []
    while True:
        try:
            s = socket.create_connection(HOST, timeout=10)
        except OSError as e:
            print("range exhausted:", e, flush=True)
            break
        ports.append(s.getsockname()[1])
        held.append(s)
    print("autobound ports", ports, flush=True)
    assert ports, "no connections opened"
    assert not [p for p in ports if 54320 <= p <= 54329], "reserved port was assigned"
else:
    sys.exit(f"unknown mode {mode}")

open("/tmp/hold.ready", "w").write(mode)
if held:
    time.sleep(3600)
