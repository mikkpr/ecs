import Entity from './entity';
import System from './system';
import performance from './performance';
import uid from './uid';
import { fastSplice } from './utils';

/**
 *
 * @class
 */
export default class ECS {
    /**
     *
     * @param {object} options - configuration options for ECS
     *                   -
     */
    constructor(options) {
        /**
         * Loop over systems in order, instead of entities
         *
         * @member {boolean}
         */
        this.systemsFirst = options.systemsFirst || false;

        /**
         * Store all entities of the ECS.
         *
         * @member {Entity[]}
         */
        this.entities = [];

        /**
         * Store all systems of the ECS.
         *
         * @member {System[]}
         */
        this.systems = [];

        /**
         * Count how many updates have been done.
         *
         * @member {number}
         */
        this.updateCounter = 0;

        /**
         * The last timestamp of an update call.
         *
         * @member
         */
        this.lastUpdate = performance.now();
    }

    /**
     * Retrieve an entity by id.
     *
     * @param {number} id - id of the entity to retrieve
     * @return {Entity} The entity if found null otherwise
     */
    getEntityById(id) {
        for (let i = 0; i < this.entities.length; ++i) {
            const entity = this.entities[i];

            if (entity.id === id) {
                return entity;
            }
        }

        return null;
    }

    /**
     * Add an entity to the ecs.
     *
     * @param {Entity} entity - The entity to add.
     */
    addEntity(entity) {
        this.entities.push(entity);

        entity.ecs = this;

        // iterate over all systems to setup valid systems
        for (let i = 0; i < this.systems.length; ++i) {
            const system = this.systems[i];

            if (system.test(entity)) {
                system.addEntity(entity);
            }
        }
    }

    /**
     * Remove an entity from the ecs by reference.
     *
     * @param {Entity} entity - reference of the entity to remove
     * @return {Entity} the remove entity if any
     */
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);

        // if the entity is not found do nothing
        if (index !== -1) {
            entity.dispose();

            fastSplice(this.entities, index, 1);
        }

        return entity;
    }

    /**
     * Add a system to the ecs.
     *
     * @param {System} system - system to add
     */
    addSystem(system) {
        this.systems.push(system);
        system.initialize();

        // iterate over all entities to eventually add system
        for (let i = 0; i < this.entities.length; ++i) {
            const entity = this.entities[i];

            if (system.test(entity)) {
                system.addEntity(entity);
            }
        }
    }

    /**
     * Remove a system from the ecs.
     *
     * @param {System} system system reference
     */
    removeSystem(system) {
        const index = this.systems.indexOf(system);

        if (index !== -1) {
            fastSplice(this.systems, index, 1);
            system.dispose();
        }
    }

    /**
     * Update the ecs.
     *
     * @method update
     */
    update() {
        const now = performance.now();
        const elapsed = now - this.lastUpdate;

        (this.systemsFirst ? this.updateSystems : this.updateEntities)();

        this.updateCounter += 1;
        this.lastUpdate = now;
    }

    updateEntities() {
        // update each entity
        for (let i = 0; i < this.entities.length; ++i) {
            const entity = this.entities[i];

            for (let j = 0; j < entity.systems.length; ++j) {
                const system = entity.systems[j];

                if (this.updateCounter % system.frequency > 0 || !system.enable) {
                    continue;
                }

                system.update(entity, elapsed);
            }
        }
    }

    updateSystems() {
        // update each system and its entities
        for (let i = 0; i < this.systems.length; ++i) {
            const system = this.systems[i];

            for (let j = 0; j < system.entities.length; ++j) {
                const entity = system.entities[j];

                if (this.updateCounter % system.frequency > 0 || !system.enable) {
                    continue;
                }

                system.update(entity, elapsed);
            }
        }
    }
}

// expose!
ECS.Entity = Entity;
ECS.System = System;
ECS.uid = uid;

/**
 * An interface describing components.
 *
 * @interface IComponent
 */

/**
 * The name of the component
 *
 * @property
 * @name IComponent#name
 * @type {string}
 */

/**
 * The factory function for the data of this component.
 *
 * @function
 * @name IComponent#data
 * @returns {*} The data object for this component.
 */
