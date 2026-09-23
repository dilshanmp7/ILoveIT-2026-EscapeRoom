import boxLaptopDefinition from "./gameObjects/box-laptop/box-laptop-object-definition";
import boxServerDefinition from "./gameObjects/box-server/box-server-object-definition";
import configDeskDefinition from "./gameObjects/config-desk/config-desk-object-definition";
import deliveryDefinition from "./gameObjects/delivery/delivery-object-definition";
import doorDefinition from "./gameObjects/door/door-object-definition";
import floorDefinition from "./gameObjects/floor/floor-object-definition";
import keyDefinition from "./gameObjects/key/key-object-definition";
import laptopDefinition from "./gameObjects/laptop/laptop-object-definition";
import officeDeskDefinition from "./gameObjects/office-desk/office-desk-object-definition";
import riddleDefinition from "./gameObjects/riddle/riddle-object-definition";
import serverRackDefinition from "./gameObjects/server-rack/server-rack-object-definition";
import serverDefinition from "./gameObjects/server/server-object-definition";
import trashDefinition from "./gameObjects/trash/trash-object-definition";
import wallDefinition from "./gameObjects/wall/wall-object-definition";
import obstacleDefinition from "./gameObjects/obstacle/obstacle-object-definition";
import type { ObjectDefinitions } from "./types";
export const objectDefinitions: ObjectDefinitions = {
  box_laptop: boxLaptopDefinition,
  box_server: boxServerDefinition,
  config_desk: configDeskDefinition,
  delivery: deliveryDefinition,
  door: doorDefinition,
  floor: floorDefinition,
  key: keyDefinition,
  laptop: laptopDefinition,
  obstacle: obstacleDefinition,
  office_desk: officeDeskDefinition,
  riddle: riddleDefinition,
  server: serverDefinition,
  server_rack: serverRackDefinition,
  trash: trashDefinition,
  wall: wallDefinition,
};
