-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `businessStructure` VARCHAR(100) NULL,
    `provisionalTaxpayer` BOOLEAN NULL,
    `firstName` VARCHAR(150) NULL,
    `lastName` VARCHAR(150) NULL,
    `companyNumber` VARCHAR(100) NULL,
    `cipcDate` DATE NULL,
    `taxNumber` VARCHAR(100) NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `country` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `payrollClient` BOOLEAN NULL,
    `cashbook` BOOLEAN NULL,
    `vatSubmission` BOOLEAN NULL,
    `jobManager` VARCHAR(150) NULL,
    `clientType` VARCHAR(50) NULL,
    `isStub` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Client_name_key`(`name`),
    INDEX `Client_jobManager_idx`(`jobManager`),
    INDEX `Client_businessStructure_idx`(`businessStructure`),
    INDEX `Client_clientType_idx`(`clientType`),
    INDEX `Client_isStub_idx`(`isStub`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobNo` VARCHAR(50) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `name` VARCHAR(500) NULL,
    `startDate` DATE NULL,
    `budget` DECIMAL(12, 2) NULL,
    `state` VARCHAR(100) NOT NULL,
    `completedDate` DATE NULL,
    `actualTimeMinutes` INTEGER NULL,
    `isStub` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Job_jobNo_key`(`jobNo`),
    INDEX `Job_clientId_idx`(`clientId`),
    INDEX `Job_state_idx`(`state`),
    INDEX `Job_startDate_idx`(`startDate`),
    INDEX `Job_completedDate_idx`(`completedDate`),
    INDEX `Job_isStub_idx`(`isStub`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `hourlyRate` DECIMAL(10, 2) NULL,
    `linkedUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StaffMember_name_key`(`name`),
    INDEX `StaffMember_linkedUserId_idx`(`linkedUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Timesheet` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clientId` INTEGER NOT NULL,
    `jobId` INTEGER NOT NULL,
    `staffMemberId` INTEGER NOT NULL,
    `entryDate` DATE NOT NULL,
    `minutes` INTEGER NOT NULL,
    `importBatchId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Timesheet_clientId_idx`(`clientId`),
    INDEX `Timesheet_jobId_idx`(`jobId`),
    INDEX `Timesheet_staffMemberId_idx`(`staffMemberId`),
    INDEX `Timesheet_entryDate_idx`(`entryDate`),
    INDEX `Timesheet_importBatchId_idx`(`importBatchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportBatch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('CLIENT', 'JOB', 'TIME') NOT NULL,
    `filename` VARCHAR(500) NOT NULL,
    `uploadedById` INTEGER NOT NULL,
    `rowsTotal` INTEGER NOT NULL,
    `rowsInserted` INTEGER NOT NULL,
    `rowsUpdated` INTEGER NOT NULL,
    `rowsSkipped` INTEGER NOT NULL,
    `status` ENUM('SUCCESS', 'PARTIAL', 'FAILED') NOT NULL,
    `summary` JSON NOT NULL,
    `warnings` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportBatch_type_idx`(`type`),
    INDEX `ImportBatch_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffMember` ADD CONSTRAINT `StaffMember_linkedUserId_fkey` FOREIGN KEY (`linkedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timesheet` ADD CONSTRAINT `Timesheet_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timesheet` ADD CONSTRAINT `Timesheet_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timesheet` ADD CONSTRAINT `Timesheet_staffMemberId_fkey` FOREIGN KEY (`staffMemberId`) REFERENCES `StaffMember`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timesheet` ADD CONSTRAINT `Timesheet_importBatchId_fkey` FOREIGN KEY (`importBatchId`) REFERENCES `ImportBatch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportBatch` ADD CONSTRAINT `ImportBatch_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
