/**
 *
 * curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
 * sudo apt-get install nodejs
 * sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
 * npm install noble
 *
 * sudo kestel_test.js
 *
 */


class kestrelK2
{
    constructor()
    {
        this.noble = require('noble');

        console.log("Start Scan");
        let service_uuids = [];
        let allow_duplicate = false;
        let that = this;

        this.noble.startScanning(service_uuids, allow_duplicate, function (error)
        {

        });

        //Callback when a BLE device was found
        this.noble.on('discover', this.returnScannedDevice.bind(this));
        this.peripheral = undefined;

        process.on('SIGINT', function ()
        {
            if (that.peripheral !== undefined)
            {
                that.disconnectDevice(that.peripheral);
            }
            setTimeout(function ()
            {
                process.exit();
            }, 1000);
        });

    }

    /**
     * Scanning for BLE devices successfull
     * @param peripheral - scanned BLE device
     */
    returnScannedDevice(peripheral)
    {
        let uuid = peripheral.advertisement.serviceUuids;

        //When the uuid is from the Kestrel Drop -> try to connect
        if (uuid !== undefined && uuid[0] !== undefined && uuid[0] === '12630000cc25497d98549b6c02c77054')
        {
            this.testBLE(peripheral);
        }
    }

    /**
     * testBLE:
     *
     * Connectes to the Kestrel Service and searches for the Characteristics to Read the Temperature
     * and write Settings to toggle LED State
     *
     * @param peripheral
     */
    testBLE(peripheral)
    {
        let that = this;

        this.peripheral = peripheral;

        //Connect to a Service
        peripheral.connect(function (error)
        {
            if (error)
            {
                console.log("Error on connect.");
                that.disconnectDevice(peripheral);
                return;
            }
            console.log("Device connected.");

            //Discover Services
            peripheral.discoverServices(['12630000cc25497d98549b6c02c77054'], function (error, services)
            {

                if (error)
                {
                    console.log("Error on service.");
                    that.disconnectDevice(peripheral);
                    return;
                }

                //Service found
                if (services[0] !== undefined)
                {
                    console.log("Service found.");

                    let service = services[0];

                    //Discover Characteristics
                    service.discoverCharacteristics(null, function (error, characteristics)
                    {
                        if (error)
                        {
                            console.log("Error on characteristics.");
                            that.disconnectDevice(peripheral);
                            return;
                        }

                        let read_characteristic = undefined;
                        let write_characteristic = undefined;

                        //Search in characteristics for the uuid
                        for (let index in characteristics)
                        {
                            if (characteristics.hasOwnProperty(index))
                            {
                                //uuid to Write LED State found
                                if (characteristics[index].uuid === '12630102cc25497d98549b6c02c77054')
                                {
                                    write_characteristic = characteristics[index];
                                }

                                //uuid to Read Temperature Found
                                if (characteristics[index].uuid === '12630001cc25497d98549b6c02c77054')
                                {
                                    read_characteristic = characteristics[index];
                                }
                            }
                        }

                        //Work with Led Characteristic
                        if (write_characteristic !== undefined)
                        {
                            that.writeLed(write_characteristic);
                        }

                        //Work with Temperature Characteristic
                        if (read_characteristic !== undefined)
                        {
                            that.readTemperature(read_characteristic);
                        }
                    });
                }
                else
                {
                    console.log("No Service Found");
                    that.disconnectDevice(peripheral);
                }
            });
        });
    }

    /**
     *
     * writeLed :
     *
     * Write Blink LED every 3 seconds
     *
     * @param write_characteristic
     */
    writeLed(write_characteristic)
    {
        setInterval(function ()
        {
            let data = new Buffer('000100', 'hex');
            console.log('--------------------------------');
            console.log("Write Buffer:");
            console.log(data);
            write_characteristic.write(data, true, function (error)
            {
                if (error)
                {
                    console.log("Error on Write LED On");
                }
                else
                {
                    console.log("Write LED On Successfull");
                }
            });
        }, 3000);
    }

    /**
     * Function to read the Drop Temperature:
     *
     * Enable notify on characteristic to get every temperature change
     *
     * @param read_characteristic
     */
    readTemperature(read_characteristic)
    {
        read_characteristic.notify(true, function (error)
        {
            if (error)
            {
                console.log("Error on Read Notify.");
                return;
            }
            console.log("Notify Enabled");

            //Read Temperature Event
            read_characteristic.on('data', function (data)
            {
                console.log('--------------------------------');
                console.log((data.readUIntLE(1, 2) / 100) + " °C");
            });
        });
    }

    /**
     * disconnectDevice:
     *
     * Disconnect BLE Device and close Programm
     *
     * @param peripheral
     */
    disconnectDevice(peripheral)
    {
        if (peripheral !== undefined)
        {
            peripheral.disconnect(function ()
            {
                console.log("Device Disconnected");
                process.exit();
            });
        }
    }

}

module.exports = kestrelK2;

new kestrelK2();
