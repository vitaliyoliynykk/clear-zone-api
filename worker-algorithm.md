# Pseudo code for worker algorithm

every 60s:
devices = getDevicesWithNewRaw()

for device in devices:
if not device.online:
continue

    raw = getNewRaw(device)
    updateSensorSignals(device, raw)
